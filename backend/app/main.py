"""SellerPilot — FastAPI Backend (E-commerce Listing Optimizer)"""

import os, json, re
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import sessionmaker, joinedload
from openai import OpenAI

from app.models import User, Product, Listing, init_db, get_engine
from app.auth import hash_password, verify_password, create_token, decode_token

AI_MODEL = os.getenv("AI_MODEL", "gpt-5-mini")
def get_openai_client():
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

app = FastAPI(title="SellerPilot", version="1.0.0")

from app.stripe_billing import router as stripe_router
app.include_router(stripe_router)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(",") if os.getenv("ALLOWED_ORIGINS") else ["*"])

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
engine = get_engine(DATABASE_URL); init_db(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

class RegisterRequest(BaseModel): email: str; password: str; name: str
class LoginRequest(BaseModel): email: str; password: str
class ProductCreate(BaseModel):
    title: str; description: str = ""; category: str = ""; cost_cents: int = 0
    marketplace: str = "amazon"; specs: dict = {}
class GenerateListingRequest(BaseModel): variant_label: str = "Primary"; style: str = "benefit-led"

@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "SellerPilot"}


# ── Brain bridge ───────────────────────────────────────────────────────────
# Proxies a freeform question to unified-donkey-betz's Personal Assistant
# (Rigby) and returns the deliberated answer. See app/brain_client.py.

class BrainAskRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


@app.post("/api/brain/ask")
def brain_ask(req: BrainAskRequest, payload: dict = Depends(decode_token)):
    from app.brain_client import ask
    if not req.message.strip():
        raise HTTPException(400, "message is required")
    result = ask(
        req.message,
        conversation_id=req.conversation_id,
        workspace="sellerpilot",
        user_id=payload.get("sub"),
    )
    if not result.get("ok"):
        raise HTTPException(502, result.get("error", "brain unreachable"))
    return result


@app.post("/api/auth/register")
def register(req: RegisterRequest):
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == req.email).first():
            raise HTTPException(400, "Email taken")
        user = User(email=req.email, name=req.name, password_hash=hash_password(req.password))
        db.add(user); db.commit(); db.refresh(user)
        return {"token": create_token(user.id, user.email), "user": {"id": user.id, "email": user.email, "name": user.name}}
    finally: db.close()

@app.post("/api/auth/login")
def login(req: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == req.email).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(401, "Invalid credentials")
        return {"token": create_token(user.id, user.email), "user": {"id": user.id, "email": user.email, "name": user.name}}
    finally: db.close()

@app.get("/api/users/me")
def get_me(payload: dict = Depends(decode_token)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user: raise HTTPException(404)
        return {"id": user.id, "email": user.email, "name": user.name}
    finally: db.close()

# ── Products ──────────────────────────────────────────────────────────────

@app.post("/api/products")
def create_product(data: ProductCreate, payload: dict = Depends(decode_token)):
    db = SessionLocal()
    try:
        product = Product(user_id=payload["sub"], title=data.title, description=data.description, category=data.category, cost_cents=data.cost_cents, marketplace=data.marketplace, specs=data.specs)
        db.add(product); db.commit(); db.refresh(product)
        return _product_dict(product)
    finally: db.close()

@app.get("/api/products")
def list_products(payload: dict = Depends(decode_token)):
    db = SessionLocal()
    try:
        products = db.query(Product).options(joinedload(Product.listings)).filter(Product.user_id == payload["sub"]).order_by(Product.created_at.desc()).all()
        return {"products": [_product_dict(p) for p in products]}
    finally: db.close()

@app.get("/api/products/{product_id}")
def get_product(product_id: str, payload: dict = Depends(decode_token)):
    db = SessionLocal()
    try:
        product = db.query(Product).options(joinedload(Product.listings)).filter(Product.id == product_id, Product.user_id == payload["sub"]).first()
        if not product: raise HTTPException(404)
        result = _product_dict(product)
        result["listings"] = [_listing_dict(l) for l in product.listings]
        return result
    finally: db.close()

# ── Listing Generation ────────────────────────────────────────────────────

@app.post("/api/products/{product_id}/optimize")
def generate_listing(product_id: str, data: GenerateListingRequest, payload: dict = Depends(decode_token)):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id, Product.user_id == payload["sub"]).first()
        if not product: raise HTTPException(404)

        result = _generate_optimized_listing(product, data.variant_label, data.style)
        listing = Listing(
            product_id=product.id, variant_label=data.variant_label,
            title_optimized=result["title"], bullets=result["bullets"],
            description_optimized=result["description"], tags=result["tags"],
            suggested_price_cents=result["price_cents"],
            score=result["score"],
        )
        db.add(listing); db.commit(); db.refresh(listing)
        return _listing_dict(listing)
    finally: db.close()

@app.get("/api/products/{product_id}/compare")
def compare_listings(product_id: str, payload: dict = Depends(decode_token)):
    db = SessionLocal()
    try:
        listings = db.query(Listing).filter(Listing.product_id == product_id).order_by(Listing.score.desc()).all()
        return {"listings": [_listing_dict(l) for l in listings]}
    finally: db.close()

# ── Stats ─────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats():
    db = SessionLocal()
    try:
        return {"total_users": db.query(User).count(), "total_products": db.query(Product).count(), "total_listings": db.query(Listing).count()}
    finally: db.close()

# ── AI Optimization ───────────────────────────────────────────────────────

def _generate_optimized_listing(product: Product, variant: str, style: str) -> dict:
    prompt = f"""Optimize this product listing for {product.marketplace}.

Product: {product.title}
Description: {product.description}
Category: {product.category}
Cost: ${product.cost_cents / 100:.2f}
Style: {style}

Return JSON:
{{"title": "SEO-optimized title (max 200 chars)", "bullets": ["5 benefit-focused bullet points"], "description": "compelling 150-word description", "tags": ["10 relevant search tags"], "price_cents": suggested_retail_price_in_cents}}"""

    if not os.getenv("OPENAI_API_KEY"):
        margin = max(int(product.cost_cents * 2.5), product.cost_cents + 1500)
        return {
            "title": f"[Optimized] {product.title} — Premium {product.category or 'Product'}",
            "bullets": [f"High-quality {product.category or 'product'} for everyday use", "Durable and long-lasting construction", "Perfect gift for any occasion", "Easy setup, no tools required", "30-day money-back guarantee"],
            "description": f"[Dev Mode] Optimized description for {product.title}. Set OPENAI_API_KEY for real AI optimization.",
            "tags": [product.category or "product", "premium", "best-seller", "top-rated", "gift", "durable", product.marketplace, "new", "trending", "value"],
            "price_cents": margin,
            "score": _calculate_score(f"[Optimized] {product.title}", 5),
        }

    try:
        response = get_openai_client().chat.completions.create(model=AI_MODEL, messages=[{"role": "user", "content": prompt}], max_tokens=1000, temperature=0.7)
        content = response.choices[0].message.content or ""
        if "```" in content:
            content = content.split("```json")[-1].split("```")[0] if "```json" in content else content.split("```")[1].split("```")[0]
        data = json.loads(content)
        data["score"] = _calculate_score(data.get("title", ""), len(data.get("bullets", [])))
        return data
    except Exception:
        return _generate_optimized_listing.__wrapped__(product, variant, style) if hasattr(_generate_optimized_listing, '__wrapped__') else {"title": product.title, "bullets": [], "description": product.description, "tags": [], "price_cents": product.cost_cents * 2, "score": 0}


def _calculate_score(title: str, bullet_count: int) -> float:
    score = 0.0
    if len(title) >= 80: score += 25
    elif len(title) >= 50: score += 15
    if len(title) <= 200: score += 10
    score += min(bullet_count * 10, 50)
    words = len(title.split())
    if words >= 5: score += 15
    return min(score, 100)


def _product_dict(p: Product) -> dict:
    return {"id": p.id, "title": p.title, "description": p.description, "category": p.category, "cost_cents": p.cost_cents, "marketplace": p.marketplace, "specs": p.specs or {}, "listing_count": len(p.listings) if p.listings else 0, "created_at": p.created_at.isoformat() if p.created_at else None}

def _listing_dict(l: Listing) -> dict:
    return {"id": l.id, "product_id": l.product_id, "variant_label": l.variant_label, "title_optimized": l.title_optimized, "bullets": l.bullets or [], "description_optimized": l.description_optimized, "tags": l.tags or [], "suggested_price_cents": l.suggested_price_cents, "score": l.score, "created_at": l.created_at.isoformat() if l.created_at else None}
