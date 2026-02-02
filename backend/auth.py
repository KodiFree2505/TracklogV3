from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import os
from passlib.context import CryptContext

auth_router = APIRouter(prefix="/auth", tags=["auth"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Detect if we're in production (HTTPS) or development (HTTP)
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development") == "production"

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class SessionRequest(BaseModel):
    session_id: str

# Database will be injected
db = None

def set_db(database):
    global db
    db = database

# Password utilities
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Cookie utilities
def set_session_cookie(response: Response, session_token: str):
    """
    Set session cookie for manual and Google login
    """
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=IS_PRODUCTION,                         # True on prod, False on localhost
        samesite="none" if IS_PRODUCTION else "lax",  # None for cross-site, lax for dev
        path="/",
        max_age=7 * 24 * 60 * 60,                     # 7 days
    )

def clear_session_cookie(response: Response):
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=IS_PRODUCTION,
        samesite="none" if IS_PRODUCTION else "lax",
    )

# Get current user from session token
async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0}
    )
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    return user_doc

# REGISTER
@auth_router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, response: Response):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)

    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    }
    await db.user_sessions.insert_one(session_doc)
    set_session_cookie(response, session_token)

    return UserResponse(user_id=user_id, email=user_data.email, name=user_data.name, picture=None)

# LOGIN
@auth_router.post("/login", response_model=UserResponse)
async def login(user_data: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user_doc or user_doc.get("auth_provider") == "google":
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(user_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    }
    await db.user_sessions.insert_one(session_doc)
    set_session_cookie(response, session_token)

    return UserResponse(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        picture=user_doc.get("picture"),
    )

# GOOGLE SESSION EXCHANGE
@auth_router.post("/session")
async def exchange_session(session_data: SessionRequest, response: Response):
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_data.session_id},
            )
            resp.raise_for_status()
            oauth_data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to verify session: {str(e)}")

    email = oauth_data["email"]
    name = oauth_data.get("name", email.split("@")[0])
    picture = oauth_data.get("picture")

    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id}, {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        })

    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    set_session_cookie(response, session_token)

    return {"user_id": user_id, "email": email, "name": name, "picture": picture}

# GET CURRENT USER
@auth_router.get("/me", response_model=UserResponse)
async def get_me(request: Request):
    user = await get_current_user(request)
    return UserResponse(
        user_id=user["user_id"], email=user["email"], name=user["name"], picture=user.get("picture")
    )

# LOGOUT
@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    clear_session_cookie(response)
    return {"message": "Logged out successfully"}
