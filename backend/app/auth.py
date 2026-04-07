import os
"""SellerPilot — Auth"""
import hashlib, hmac
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("SECRET_KEY", "founder-toolkit-shared-secret-2026")
ALGORITHM = "HS256"
security = HTTPBearer()

def hash_password(p: str) -> str:
    return hashlib.sha256((p + SECRET_KEY).encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(plain), hashed)

def create_token(user_id: str, email: str) -> str:
    return jwt.encode({"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24)}, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try: return jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError: raise HTTPException(status_code=401, detail="Invalid token")
