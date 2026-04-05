"""SellerPilot — Seed demo data"""
from sqlalchemy.orm import sessionmaker
from app.models import User, Product, init_db, get_engine
from app.auth import hash_password

DATABASE_URL = "sqlite:///./sellerpilot.db"

PRODUCTS = [
    {"title": "Bamboo Wireless Charging Pad", "description": "Eco-friendly wireless charger made from sustainable bamboo. Qi-compatible, 10W fast charge.", "category": "Electronics", "cost_cents": 800, "marketplace": "amazon"},
    {"title": "Artisan Soy Candle Set (3-Pack)", "description": "Hand-poured soy candles in vanilla, lavender, and eucalyptus. 40-hour burn time each.", "category": "Home & Garden", "cost_cents": 1200, "marketplace": "etsy"},
    {"title": "Minimalist Leather Wallet", "description": "Slim RFID-blocking wallet, genuine leather, holds 8 cards + cash. Available in black and brown.", "category": "Accessories", "cost_cents": 1500, "marketplace": "shopify"},
]

def seed():
    engine = get_engine(DATABASE_URL); init_db(DATABASE_URL)
    Session = sessionmaker(bind=engine); db = Session()
    if db.query(User).count() > 0: print("Already seeded"); db.close(); return
    user = User(email="demo@sellerpilot.dev", name="Demo Seller", password_hash=hash_password("demo123"))
    db.add(user); db.flush()
    for p in PRODUCTS:
        db.add(Product(user_id=user.id, **p))
    db.commit()
    print(f"Seeded 1 user + {len(PRODUCTS)} products")
    db.close()

if __name__ == "__main__": seed()
