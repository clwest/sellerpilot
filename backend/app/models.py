"""SellerPilot — Data Models"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, create_engine
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()
def gen_uuid(): return str(uuid.uuid4())
def utcnow(): return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    products = relationship("Product", back_populates="user", order_by="Product.created_at.desc()")

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    specs = Column(JSON, default=dict)
    cost_cents = Column(Integer, default=0)
    images = Column(JSON, default=list)
    marketplace = Column(String, default="amazon")  # amazon, etsy, shopify
    created_at = Column(DateTime, default=utcnow)
    user = relationship("User", back_populates="products")
    listings = relationship("Listing", back_populates="product", order_by="Listing.created_at.desc()")

class Listing(Base):
    __tablename__ = "listings"
    id = Column(String, primary_key=True, default=gen_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    variant_label = Column(String, default="Primary")
    title_optimized = Column(String, nullable=True)
    bullets = Column(JSON, default=list)
    description_optimized = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    suggested_price_cents = Column(Integer, default=0)
    score = Column(Float, default=0.0)  # readability + keyword density heuristic
    created_at = Column(DateTime, default=utcnow)
    product = relationship("Product", back_populates="listings")

def get_engine(url="sqlite:///./sellerpilot.db"):
    return create_engine(url, echo=False)

def init_db(url="sqlite:///./sellerpilot.db"):
    engine = get_engine(url)
    Base.metadata.create_all(engine)
    return engine
