from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
import base64

sightings_router = APIRouter(prefix="/sightings", tags=["sightings"])

# Database will be injected
db = None

def set_db(database):
    global db
    db = database

# Models
class SightingCreate(BaseModel):
    train_number: str
    train_type: str
    operator: str
    route: Optional[str] = None
    location: str
    sighting_date: str  # ISO format date
    sighting_time: str  # HH:MM format
    notes: Optional[str] = None
    photos: List[str] = []  # Base64 encoded images or URLs

class SightingUpdate(BaseModel):
    train_number: Optional[str] = None
    train_type: Optional[str] = None
    operator: Optional[str] = None
    route: Optional[str] = None
    location: Optional[str] = None
    sighting_date: Optional[str] = None
    sighting_time: Optional[str] = None
    notes: Optional[str] = None
    photos: Optional[List[str]] = None

class SightingResponse(BaseModel):
    sighting_id: str
    user_id: str
    train_number: str
    train_type: str
    operator: str
    route: Optional[str] = None
    location: str
    sighting_date: str
    sighting_time: str
    notes: Optional[str] = None
    photos: List[str] = []
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

# Helper to get current user from request
async def get_current_user_id(request: Request) -> str:
    from auth import get_current_user
    user = await get_current_user(request)
    return user["user_id"]

@sightings_router.post("", response_model=SightingResponse)
async def create_sighting(sighting_data: SightingCreate, request: Request):
    """Create a new train sighting"""
    user_id = await get_current_user_id(request)
    
    sighting_id = f"sighting_{uuid.uuid4().hex[:12]}"
    
    # Process photos - save base64 images to files
    saved_photos = []
    for i, photo in enumerate(sighting_data.photos):
        if photo.startswith("data:image"):
            # Extract base64 data
            try:
                header, data = photo.split(",", 1)
                ext = "jpg" if "jpeg" in header else "png"
                filename = f"{sighting_id}_{i}.{ext}"
                filepath = f"/app/backend/uploads/{filename}"
                
                # Ensure uploads directory exists
                os.makedirs("/app/backend/uploads", exist_ok=True)
                
                # Save file
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(data))
                
                saved_photos.append(f"/api/uploads/{filename}")
            except Exception as e:
                print(f"Error saving photo: {e}")
                continue
        else:
            # Already a URL
            saved_photos.append(photo)
    
    sighting_doc = {
        "sighting_id": sighting_id,
        "user_id": user_id,
        "train_number": sighting_data.train_number,
        "train_type": sighting_data.train_type,
        "operator": sighting_data.operator,
        "route": sighting_data.route,
        "location": sighting_data.location,
        "sighting_date": sighting_data.sighting_date,
        "sighting_time": sighting_data.sighting_time,
        "notes": sighting_data.notes,
        "photos": saved_photos,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.sightings.insert_one(sighting_doc)
    
    return SightingResponse(**sighting_doc)

@sightings_router.get("", response_model=List[SightingResponse])
async def get_sightings(request: Request, limit: int = 100, skip: int = 0):
    """Get all sightings for current user"""
    user_id = await get_current_user_id(request)
    
    sightings = await db.sightings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return [SightingResponse(**s) for s in sightings]

@sightings_router.get("/stats", response_model=SightingStats)
async def get_sighting_stats(request: Request):
    """Get statistics for current user's sightings"""
    user_id = await get_current_user_id(request)
    
    # Get all sightings for user
    sightings = await db.sightings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    if not sightings:
        return SightingStats(
            total_sightings=0,
            this_month=0,
            unique_locations=0,
            unique_trains=0,
            last_sighting=None,
            top_train_types=[],
            top_operators=[],
            top_locations=[]
        )
    
    # Calculate stats
    total = len(sightings)
    
    # This month count
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    this_month = sum(1 for s in sightings if s["sighting_date"].startswith(current_month))
    
    # Unique counts
    unique_locations = len(set(s["location"] for s in sightings))
    unique_trains = len(set(s["train_number"] for s in sightings))
    
    # Last sighting
    last_sighting = max(s["created_at"] for s in sightings) if sightings else None
    
    # Top train types
    train_type_counts = {}
    for s in sightings:
        t = s["train_type"]
        train_type_counts[t] = train_type_counts.get(t, 0) + 1
    top_train_types = [{"name": k, "count": v} for k, v in sorted(train_type_counts.items(), key=lambda x: -x[1])[:5]]
    
    # Top operators
    operator_counts = {}
    for s in sightings:
        o = s["operator"]
        operator_counts[o] = operator_counts.get(o, 0) + 1
    top_operators = [{"name": k, "count": v} for k, v in sorted(operator_counts.items(), key=lambda x: -x[1])[:5]]
    
    # Top locations
    location_counts = {}
    for s in sightings:
        l = s["location"]
        location_counts[l] = location_counts.get(l, 0) + 1
    top_locations = [{"name": k, "count": v} for k, v in sorted(location_counts.items(), key=lambda x: -x[1])[:5]]
    
    return SightingStats(
        total_sightings=total,
        this_month=this_month,
        unique_locations=unique_locations,
        unique_trains=unique_trains,
        last_sighting=last_sighting,
        top_train_types=top_train_types,
        top_operators=top_operators,
        top_locations=top_locations
    )

@sightings_router.get("/{sighting_id}", response_model=SightingResponse)
async def get_sighting(sighting_id: str, request: Request):
    """Get a specific sighting"""
    user_id = await get_current_user_id(request)
    
    sighting = await db.sightings.find_one(
        {"sighting_id": sighting_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not sighting:
        raise HTTPException(status_code=404, detail="Sighting not found")
    
    return SightingResponse(**sighting)

@sightings_router.delete("/{sighting_id}")
async def delete_sighting(sighting_id: str, request: Request):
    """Delete a sighting"""
    user_id = await get_current_user_id(request)
    
    # Find sighting first to delete photos
    sighting = await db.sightings.find_one(
        {"sighting_id": sighting_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not sighting:
        raise HTTPException(status_code=404, detail="Sighting not found")
    
    # Delete associated photos
    for photo in sighting.get("photos", []):
        if photo.startswith("/api/uploads/"):
            filename = photo.replace("/api/uploads/", "")
            filepath = f"/app/backend/uploads/{filename}"
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception as e:
                print(f"Error deleting photo: {e}")
    
    # Delete sighting
    await db.sightings.delete_one({"sighting_id": sighting_id, "user_id": user_id})
    
    return {"message": "Sighting deleted successfully"}
