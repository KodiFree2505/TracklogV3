from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
import shutil

sightings_router = APIRouter(prefix="/sightings", tags=["sightings"])

# Database injected externally
db = None

def set_db(database):
    global db
    db = database


# ---------------------------
# Auth helper
# ---------------------------
async def get_current_user_id(request: Request) -> str:
    from auth import get_current_user
    user = await get_current_user(request)
    return user["user_id"]


# ---------------------------
# CREATE SIGHTING (MULTIPART)
# ---------------------------
@sightings_router.post("")
async def create_sighting(
    request: Request,
    train_number: str = Form(...),
    train_type: str = Form(...),
    traction_type: str = Form(...),
    operator: str = Form(...),
    location: str = Form(...),
    sighting_date: str = Form(...),
    sighting_time: str = Form(...),
    route: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    photos: Optional[List[UploadFile]] = File(None),
):
    """
    Create a new train sighting (Emergent-safe)
    """
    user_id = await get_current_user_id(request)
    sighting_id = f"sighting_{uuid.uuid4().hex[:12]}"

    upload_dir = "/app/backend/uploads"
    os.makedirs(upload_dir, exist_ok=True)

    saved_photos: List[str] = []

    if photos:
        for idx, photo in enumerate(photos):
            if not photo.content_type.startswith("image/"):
                continue

            ext = photo.filename.split(".")[-1].lower()
            filename = f"{sighting_id}_{idx}.{ext}"
            filepath = os.path.join(upload_dir, filename)

            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)

            saved_photos.append(f"/api/uploads/{filename}")

    sighting_doc = {
        "sighting_id": sighting_id,
        "user_id": user_id,
        "train_number": train_number,
        "train_type": train_type,
        "traction_type": traction_type,
        "operator": operator,
        "route": route,
        "location": location,
        "sighting_date": sighting_date,
        "sighting_time": sighting_time,
        "notes": notes,
        "photos": saved_photos,
        "created_at": datetime.now(timezone.utc),
    }

    await db.sightings.insert_one(sighting_doc)

    return sighting_doc


# ---------------------------
# GET USER SIGHTINGS
# ---------------------------
@sightings_router.get("")
async def get_sightings(request: Request, limit: int = 100, skip: int = 0):
    user_id = await get_current_user_id(request)

    sightings = await db.sightings.find(
        {"user_id": user_id},
        {"_id": 0},
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return sightings


# ---------------------------
# GET SINGLE SIGHTING
# ---------------------------
@sightings_router.get("/{sighting_id}")
async def get_sighting(sighting_id: str, request: Request):
    user_id = await get_current_user_id(request)

    sighting = await db.sightings.find_one(
        {"sighting_id": sighting_id, "user_id": user_id},
        {"_id": 0},
    )

    if not sighting:
        raise HTTPException(status_code=404, detail="Sighting not found")

    return sighting


# ---------------------------
# DELETE SIGHTING
# ---------------------------
@sightings_router.delete("/{sighting_id}")
async def delete_sighting(sighting_id: str, request: Request):
    user_id = await get_current_user_id(request)

    sighting = await db.sightings.find_one(
        {"sighting_id": sighting_id, "user_id": user_id},
        {"_id": 0},
    )

    if not sighting:
        raise HTTPException(status_code=404, detail="Sighting not found")

    for photo in sighting.get("photos", []):
        if photo.startswith("/api/uploads/"):
            filename = photo.replace("/api/uploads/", "")
            filepath = f"/app/backend/uploads/{filename}"
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception:
                    pass

    await db.sightings.delete_one({"sighting_id": sighting_id, "user_id": user_id})

    return {"message": "Sighting deleted successfully"}


# ---------------------------
# STATS (SAFE, NO BODY)
# ---------------------------
@sightings_router.get("/stats")
async def get_sighting_stats(request: Request):
    user_id = await get_current_user_id(request)

    sightings = await db.sightings.find(
        {"user_id": user_id},
        {"_id": 0},
    ).to_list(1000)

    if not sightings:
        return {
            "total_sightings": 0,
            "this_month": 0,
            "unique_locations": 0,
            "unique_trains": 0,
            "last_sighting": None,
            "top_train_types": [],
            "top_operators": [],
            "top_locations": [],
        }

    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")

    return {
        "total_sightings": len(sightings),
        "this_month": sum(1 for s in sightings if s["sighting_date"].startswith(current_month)),
        "unique_locations": len({s["location"] for s in sightings}),
        "unique_trains": len({s["train_number"] for s in sightings}),
        "last_sighting": max(s["created_at"] for s in sightings),
        "top_train_types": _top_counts(sightings, "train_type"),
        "top_operators": _top_counts(sightings, "operator"),
        "top_locations": _top_counts(sightings, "location"),
    }


def _top_counts(items, key):
    counts = {}
    for item in items:
        val = item.get(key)
        if val:
            counts[val] = counts.get(val, 0) + 1
    return [{"name": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])[:5]]
