from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import os
import base64
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

auth_router = APIRouter(prefix="/auth", tags=["auth"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database will be injected
db = None

def set_db(database):
    global db
    db = database

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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
    auth_provider: Optional[str] = None
    is_profile_public: bool = False
    auth_provider: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class SessionRequest(BaseModel):
    session_id: str

def set_session_cookie(response: Response, session_token: str):
    # Clear any old cookies with different attributes first
    response.delete_cookie(key="session_token", path="/")
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 60 * 60
    )

def clear_session_cookie(response: Response):
    response.delete_cookie(key="session_token", path="/")

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
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
        {"user_id": session_doc["user_id"]},
        {"_id": 0, "password_hash": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user_doc

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
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(user_doc)
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    set_session_cookie(response, session_token)
    
    return UserResponse(user_id=user_id, email=user_data.email, name=user_data.name, picture=None, auth_provider="email")

@auth_router.post("/login", response_model=UserResponse)
async def login(user_data: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user_doc.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="Please use Google Sign-In for this account")
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    set_session_cookie(response, session_token)
    
    return UserResponse(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        picture=user_doc.get("picture"),
        auth_provider=user_doc.get("auth_provider", "email"),
        is_profile_public=user_doc.get("is_profile_public", False)
    )

@auth_router.post("/session")
async def exchange_session(session_data: SessionRequest, response: Response):
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
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
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
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    set_session_cookie(response, session_token)
    
    return {"user_id": user_id, "email": email, "name": name, "picture": picture}

@auth_router.get("/me", response_model=UserResponse)
async def get_me(request: Request):
    user = await get_current_user(request)
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        auth_provider=user.get("auth_provider"),
        is_profile_public=user.get("is_profile_public", False)
    )

@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    clear_session_cookie(response)
    return {"message": "Logged out successfully"}

@auth_router.put("/profile", response_model=UserResponse)
async def update_profile(user_data: UserUpdate, request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    update_fields = {}
    if user_data.name is not None:
        update_fields["name"] = user_data.name
    if user_data.picture is not None:
        if user_data.picture.startswith("data:image"):
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
        await db.users.update_one({"user_id": user_id}, {"$set": update_fields})
    
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(
        user_id=updated_user["user_id"],
        email=updated_user["email"],
        name=updated_user["name"],
        picture=updated_user.get("picture"),
        auth_provider=updated_user.get("auth_provider"),
        is_profile_public=updated_user.get("is_profile_public", False)
    )

@auth_router.put("/password")
async def update_password(password_data: PasswordUpdate, request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="Cannot change password for Google accounts")
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=400, detail="No password set for this account")
    
    if not verify_password(password_data.current_password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one({"user_id": user_id}, {"$set": {"password_hash": new_hash}})
    
    return {"message": "Password updated successfully"}

@auth_router.delete("/account")
async def delete_account(request: Request, response: Response):
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.sightings.delete_many({"user_id": user_id})
    await db.users.delete_one({"user_id": user_id})
    
    clear_session_cookie(response)
    return {"message": "Account deleted successfully"}


class ProfileVisibilityUpdate(BaseModel):
    is_profile_public: bool

@auth_router.put("/profile/visibility")
async def toggle_profile_visibility(data: ProfileVisibilityUpdate, request: Request):
    user = await get_current_user(request)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"is_profile_public": data.is_profile_public}}
    )
    return {"message": "Profile visibility updated", "is_profile_public": data.is_profile_public}


# ── Forgot Password / Reset ─────────────────────────────────────

def send_reset_email(to_email: str, reset_link: str):
    smtp_email = os.environ.get("SMTP_EMAIL")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    if not smtp_email or not smtp_password:
        raise HTTPException(status_code=500, detail="Email service not configured")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your TrackLog password"
    msg["From"] = f"TrackLog <{smtp_email}>"
    msg["To"] = to_email

    text = f"Reset your password by visiting: {reset_link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email."

    html = f"""\
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f10;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="color:#e34c26;font-weight:bold;font-size:22px;letter-spacing:2px;">TRACKLOG</span>
  </div>
  <h2 style="color:#fff;font-size:20px;margin-bottom:8px;">Password Reset</h2>
  <p style="color:#9ca3af;font-size:14px;line-height:1.6;">
    We received a request to reset your password. Click the button below to choose a new one.
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="{reset_link}" style="background:#e34c26;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
      Reset Password
    </a>
  </div>
  <p style="color:#6b7280;font-size:12px;line-height:1.5;">
    This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
  </p>
</div>"""

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
    except Exception as e:
        logger.error(f"Failed to send reset email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@auth_router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    # Always return success to avoid leaking which emails exist
    if not user:
        return {"message": "If an account with that email exists, a reset link has been sent."}

    if user.get("auth_provider") == "google":
        return {"message": "If an account with that email exists, a reset link has been sent."}

    token = uuid.uuid4().hex
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "created_at": datetime.now(timezone.utc),
        "used": False,
    })

    origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
    if not origin:
        origin = str(request.base_url).rstrip("/")
    reset_link = f"{origin}/reset-password?token={token}"

    send_reset_email(user["email"], reset_link)
    return {"message": "If an account with that email exists, a reset link has been sent."}


@auth_router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_doc = await db.password_resets.find_one(
        {"token": data.token, "used": False}, {"_id": 0}
    )
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    expires_at = reset_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link has expired")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"user_id": reset_doc["user_id"]},
        {"$set": {"password_hash": new_hash}},
    )
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}},
    )
    # Invalidate all sessions for security
    await db.user_sessions.delete_many({"user_id": reset_doc["user_id"]})

    return {"message": "Password has been reset successfully. Please sign in with your new password."}
