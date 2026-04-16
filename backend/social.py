from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

social_router = APIRouter(prefix="/social", tags=["social"])

db = None

def set_db(database):
    global db
    db = database


async def get_current_user(request: Request) -> dict:
    from auth import get_current_user as auth_get_user
    return await auth_get_user(request)


# ── Helpers ──────────────────────────────────────────────────────

async def create_notification(
    user_id: str,
    notif_type: str,
    actor_id: str,
    sighting_id: str = None,
    message: str = "",
):
    """Create a notification for user_id. Skips if actor == user (no self-notify)."""
    if actor_id == user_id:
        return
    actor = await db.users.find_one({"user_id": actor_id}, {"_id": 0, "name": 1, "picture": 1})
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": notif_type,
        "actor_id": actor_id,
        "actor_name": actor.get("name", "Someone") if actor else "Someone",
        "actor_picture": actor.get("picture") if actor else None,
        "sighting_id": sighting_id,
        "message": message,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    })


# ── Follow ───────────────────────────────────────────────────────

@social_router.post("/follow/{target_user_id}")
async def toggle_follow(target_user_id: str, request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]
    if user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0, "user_id": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.follows.find_one({"follower_id": user_id, "following_id": target_user_id})
    if existing:
        await db.follows.delete_one({"follower_id": user_id, "following_id": target_user_id})
        following = False
    else:
        await db.follows.insert_one({
            "follower_id": user_id,
            "following_id": target_user_id,
            "created_at": datetime.now(timezone.utc),
        })
        following = True
        await create_notification(
            user_id=target_user_id,
            notif_type="follow",
            actor_id=user_id,
            message=f"{user.get('name', 'Someone')} started following you",
        )

    follower_count = await db.follows.count_documents({"following_id": target_user_id})
    return {"following": following, "follower_count": follower_count}


@social_router.get("/following/me")
async def get_my_following(request: Request):
    user = await get_current_user(request)
    docs = await db.follows.find(
        {"follower_id": user["user_id"]}, {"_id": 0, "following_id": 1}
    ).to_list(5000)
    return {"following_ids": [d["following_id"] for d in docs]}


@social_router.get("/users/search")
async def search_users(q: str = "", page: int = 1, limit: int = 20):
    skip = (page - 1) * limit
    query = {"is_profile_public": True}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}

    total = await db.users.count_documents(query)
    users = await db.users.find(
        query, {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    results = []
    for u in users:
        uid = u["user_id"]
        follower_count = await db.follows.count_documents({"following_id": uid})
        following_count = await db.follows.count_documents({"follower_id": uid})
        sighting_count = await db.sightings.count_documents({"user_id": uid, "is_public": True})
        results.append({
            "user_id": uid,
            "name": u.get("name", "Unknown"),
            "picture": u.get("picture"),
            "follower_count": follower_count,
            "following_count": following_count,
            "sighting_count": sighting_count,
            "created_at": u["created_at"].isoformat() if hasattr(u.get("created_at"), "isoformat") else str(u.get("created_at", "")),
        })

    return {
        "users": results,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if limit else 1,
    }


@social_router.get("/followers/{user_id}")
async def get_follower_count(user_id: str):
    count = await db.follows.count_documents({"following_id": user_id})
    return {"follower_count": count}


# ── Notifications ────────────────────────────────────────────────

@social_router.get("/notifications")
async def get_notifications(request: Request, limit: int = 30):
    user = await get_current_user(request)
    notifs = await db.notifications.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    for n in notifs:
        if hasattr(n.get("created_at"), "isoformat"):
            n["created_at"] = n["created_at"].isoformat()
    return {"notifications": notifs}


@social_router.get("/notifications/unread-count")
async def get_unread_count(request: Request):
    user = await get_current_user(request)
    count = await db.notifications.count_documents(
        {"user_id": user["user_id"], "read": False}
    )
    return {"unread_count": count}


@social_router.put("/notifications/read")
async def mark_all_read(request: Request):
    user = await get_current_user(request)
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True}},
    )
    return {"message": "All notifications marked as read"}
