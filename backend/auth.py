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

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def set_session_cookie(response: Response, session_token: str):
    """Set session cookie with appropriate settings for environment"""
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 60 * 60
    )

def clear_session_cookie(response: Response):
    """Clear session cookie"""
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=IS_PRODUCTION,
        samesite="lax"
    )

async def get_current_user(request: Request) -> dict:
    """Get current user from session token in cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0, "password_hash": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user_doc

@auth_router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, response: Response):
    """Register a new user with email and password"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    set_session_cookie(response, session_token)
    
    return UserResponse(
        user_id=user_id,
        email=user_data.email,
        name=user_data.name,
        picture=None
    )

@auth_router.post("/login", response_model=UserResponse)
async def login(user_data: UserLogin, response: Response):
    """Login with email and password"""
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password (only for email auth users)
    if user_doc.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="Please use Google Sign-In for this account")
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    set_session_cookie(response, session_token)
    
    return UserResponse(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        picture=user_doc.get("picture")
    )

@auth_router.post("/session")
async def exchange_session(session_data: SessionRequest, response: Response):
    """Exchange Google OAuth session_id for session_token"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_data.session_id}
            )
            resp.raise_for_status()
            oauth_data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to verify session: {str(e)}")
    
    email = oauth_data["email"]
    name = oauth_data.get("name", email.split("@")[0])
    picture = oauth_data.get("picture")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user data if needed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    set_session_cookie(response, session_token)
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture
    }

@auth_router.get("/me", response_model=UserResponse)
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture")
    )

@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    clear_session_cookie(response)
    
    return {"message": "Logged out successfully"}


@auth_router.put("/profile", response_model=UserResponse)
async def update_profile(user_data: UserUpdate, request: Request):
    """Update user profile (name, picture)"""
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    update_fields = {}
    if user_data.name is not None:
        update_fields["name"] = user_data.name
    if user_data.picture is not None:
        # Handle base64 image upload
        if user_data.picture.startswith("data:image"):
            import base64
            import os
            try:
                header, data = user_data.picture.split(",", 1)
                ext = "jpg" if "jpeg" in header else "png"
                filename = f"profile_{user_id}.{ext}"
                filepath = f"/app/backend/uploads/{filename}"
                
                os.makedirs("/app/backend/uploads", exist_ok=True)
                
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(data))
                
                update_fields["picture"] = f"/api/uploads/{filename}"
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to save image: {str(e)}")
        else:
            update_fields["picture"] = user_data.picture
    
    if update_fields:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    return UserResponse(
        user_id=updated_user["user_id"],
        email=updated_user["email"],
        name=updated_user["name"],
        picture=updated_user.get("picture")
    )

@auth_router.put("/password")
async def update_password(password_data: PasswordUpdate, request: Request):
    """Update user password"""
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    # Get full user doc with password
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user uses Google auth
    if user_doc.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="Cannot change password for Google accounts")
    
    # Verify current password
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=400, detail="No password set for this account")
    
    if not verify_password(password_data.current_password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Update password
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password updated successfully"}

@auth_router.delete("/account")
async def delete_account(request: Request, response: Response):
    """Delete user account and all associated data"""
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    # Delete all user sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Delete all user sightings
    await db.sightings.delete_many({"user_id": user_id})
    
    # Delete user
    await db.users.delete_one({"user_id": user_id})
    
    # Clear cookie
    clear_session_cookie(response)
    
    return {"message": "Account deleted successfully"}

