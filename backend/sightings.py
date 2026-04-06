from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
import base64

sightings_router = APIRouter(prefix="/sightings", tags=["sightings"])

db = None

def set_db(database):
    global db
    db = database

# Models
class SightingCreate(BaseModel):
    train_number: str
    train_type: str
    traction_type: str
    operator: str
    route: Optional[str] = None
    location: str
    sighting_date: str
    sighting_time: str
    notes: Optional[str] = None
    photos: List[str] = []
    is_public: bool = False

class SightingResponse(BaseModel):
    sighting_id: str
    user_id: str
    train_number: str
    train_type: str
    traction_type: Optional[str] = None
    operator: str
    route: Optional[str] = None
    location: str
    sighting_date: str
    sighting_time: str
    notes: Optional[str] = None
    photos: List[str] = []
    is_public: bool = False
    share_id: Optional[str] = None
    created_at: datetime

class SightingStats(BaseModel):
    total_sightings: int
    this_month: int
    unique_locations: int
    unique_trains: int
    last_sighting: Optional[datetime] = None
    top_train_types: List[dict] = []
    top_operators: List[dict] = []
    top_locations: List[dict] = []

async def get_current_user_id(request: Request) -> str:
    from auth import get_current_user
    user = await get_current_user(request)
    return user["user_id"]

@sightings_router.post("", response_model=SightingResponse)
async def create_sighting(sighting_data: SightingCreate, request: Request):
    user_id = await get_current_user_id(request)
    sighting_id = f"sighting_{uuid.uuid4().hex[:12]}"
    
    upload_dir = "/app/backend/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    saved_photos = []
    for i, photo in enumerate(sighting_data.photos):
        if photo.startswith("data:image"):
            try:
                header, data = photo.split(",", 1)
                ext = "jpg" if "jpeg" in header else "png"
                filename = f"{sighting_id}_{i}.{ext}"
                filepath = os.path.join(upload_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(data))
                saved_photos.append(f"/api/uploads/{filename}")
            except Exception as e:
                print(f"Error saving photo: {e}")
        elif photo:
            saved_photos.append(photo)
    
    sighting_doc = {
        "sighting_id": sighting_id,
        "user_id": user_id,
        "train_number": sighting_data.train_number,
        "train_type": sighting_data.train_type,
        "traction_type": sighting_data.traction_type,
        "operator": sighting_data.operator,
        "route": sighting_data.route,
        "location": sighting_data.location,
        "sighting_date": sighting_data.sighting_date,
        "sighting_time": sighting_data.sighting_time,
        "notes": sighting_data.notes,
        "photos": saved_photos,
        "is_public": sighting_data.is_public,
        "share_id": uuid.uuid4().hex[:8],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.sightings.insert_one(sighting_doc)
    return SightingResponse(**sighting_doc)

@sightings_router.get("", response_model=List[SightingResponse])
async def get_sightings(request: Request, limit: int = 100, skip: int = 0):
    user_id = await get_current_user_id(request)
    sightings = await db.sightings.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    results = []
    for s in sightings:
        if "share_id" not in s:
            s["share_id"] = uuid.uuid4().hex[:8]
            s["is_public"] = s.get("is_public", False)
            await db.sightings.update_one(
                {"sighting_id": s["sighting_id"]},
                {"$set": {"share_id": s["share_id"], "is_public": s["is_public"]}}
            )
        results.append(SightingResponse(**s))
    return results

@sightings_router.get("/stats", response_model=SightingStats)
async def get_sighting_stats(request: Request):
    user_id = await get_current_user_id(request)
    sightings = await db.sightings.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    if not sightings:
        return SightingStats(
            total_sightings=0, this_month=0, unique_locations=0,
            unique_trains=0, last_sighting=None,
            top_train_types=[], top_operators=[], top_locations=[]
        )
    
    total = len(sightings)
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    this_month = sum(1 for s in sightings if s["sighting_date"].startswith(current_month))
    unique_locations = len(set(s["location"] for s in sightings))
    unique_trains = len(set(s["train_number"] for s in sightings))
    last_sighting = max(s["created_at"] for s in sightings) if sightings else None
    
    train_type_counts = {}
    operator_counts = {}
    location_counts = {}
    
    for s in sightings:
        t = s["train_type"]
        train_type_counts[t] = train_type_counts.get(t, 0) + 1
        o = s["operator"]
        operator_counts[o] = operator_counts.get(o, 0) + 1
        loc = s["location"]
        location_counts[loc] = location_counts.get(loc, 0) + 1
    
    top_train_types = [{"name": k, "count": v} for k, v in sorted(train_type_counts.items(), key=lambda x: -x[1])[:5]]
    top_operators = [{"name": k, "count": v} for k, v in sorted(operator_counts.items(), key=lambda x: -x[1])[:5]]
    top_locations = [{"name": k, "count": v} for k, v in sorted(location_counts.items(), key=lambda x: -x[1])[:5]]
    
    return SightingStats(
        total_sightings=total, this_month=this_month,
        unique_locations=unique_locations, unique_trains=unique_trains,
        last_sighting=last_sighting,
        top_train_types=top_train_types, top_operators=top_operators, top_locations=top_locations
    )

@sightings_router.get("/{sighting_id}", response_model=SightingResponse)
async def get_sighting(sighting_id: str, request: Request):
    user_id = await get_current_user_id(request)
    sighting = await db.sightings.find_one(
        {"sighting_id": sighting_id, "user_id": user_id}, {"_id": 0}
    )
    if not sighting:
        raise HTTPException(status_code=404, detail="Sighting not found")
    return SightingResponse(**sighting)

@sightings_router.delete("/{sighting_id}")
async def delete_sighting(sighting_id: str, request: Request):
    user_id = await get_current_user_id(request)
    sighting = await db.sightings.find_one(
        {"sighting_id": sighting_id, "user_id": user_id}, {"_id": 0}
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
                except:
                    pass
    
    await db.sightings.delete_one({"sighting_id": sighting_id, "user_id": user_id})
    return {"message": "Sighting deleted successfully"}


class VisibilityUpdate(BaseModel):
    is_public: bool

@sightings_router.put("/{sighting_id}/visibility")
async def toggle_sighting_visibility(sighting_id: str, data: VisibilityUpdate, request: Request):
    user_id = await get_current_user_id(request)
    sighting = await db.sightings.find_one(
        {"sighting_id": sighting_id, "user_id": user_id}, {"_id": 0}
    )
    if not sighting:
        raise HTTPException(status_code=404, detail="Sighting not found")
    
    await db.sightings.update_one(
        {"sighting_id": sighting_id},
        {"$set": {"is_public": data.is_public}}
    )
    return {"message": "Visibility updated", "is_public": data.is_public}
