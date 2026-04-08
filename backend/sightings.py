from fastapi import APIRouter, HTTPException, Request, Form, File, UploadFile
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
import base64
import logging

logger = logging.getLogger(__name__)

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
    try:
        user_id = await get_current_user_id(request)
    except Exception as e:
        logger.error(f"Auth error in create_sighting: {e}")
        raise
    
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
                logger.error(f"Error saving photo: {e}")
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
    
    try:
        await db.sightings.insert_one(sighting_doc)
    except Exception as e:
        logger.error(f"MongoDB insert error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    sighting_doc.pop("_id", None)
    return SightingResponse(**sighting_doc)

@sightings_router.post("/upload", response_model=SightingResponse)
async def create_sighting_with_files(
    request: Request,
    train_number: str = Form(...),
    train_type: str = Form(...),
    traction_type: str = Form(...),
    operator: str = Form(...),
    location: str = Form(...),
    sighting_date: str = Form(...),
    sighting_time: str = Form(...),
    route: str = Form(""),
    notes: str = Form(""),
    is_public: bool = Form(False),
    photos: List[UploadFile] = File(default=[]),
):
    user_id = await get_current_user_id(request)
    sighting_id = f"sighting_{uuid.uuid4().hex[:12]}"
    
    upload_dir = "/app/backend/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    saved_photos = []
    for i, photo in enumerate(photos):
        if photo.filename:
            try:
                ext = photo.filename.rsplit(".", 1)[-1] if "." in photo.filename else "jpg"
                filename = f"{sighting_id}_{i}.{ext}"
                filepath = os.path.join(upload_dir, filename)
                content = await photo.read()
                with open(filepath, "wb") as f:
                    f.write(content)
                saved_photos.append(f"/api/uploads/{filename}")
            except Exception as e:
                logger.error(f"Error saving uploaded photo: {e}")
    
    sighting_doc = {
        "sighting_id": sighting_id,
        "user_id": user_id,
        "train_number": train_number,
        "train_type": train_type,
        "traction_type": traction_type,
        "operator": operator,
        "route": route or None,
        "location": location,
        "sighting_date": sighting_date,
        "sighting_time": sighting_time,
        "notes": notes or None,
        "photos": saved_photos,
        "is_public": is_public,
        "share_id": uuid.uuid4().hex[:8],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.sightings.insert_one(sighting_doc)
    sighting_doc.pop("_id", None)
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

@sightings_router.get("/analytics")
async def get_analytics(request: Request):
    user_id = await get_current_user_id(request)
    sightings = await db.sightings.find({"user_id": user_id}, {"_id": 0}).to_list(5000)

    # Platform-wide stats
    all_count = await db.sightings.count_documents({})
    all_users = await db.users.count_documents({})

    if not sightings:
        return {
            "sightings_over_time": [],
            "by_train_type": [],
            "by_traction_type": [],
            "by_operator": [],
            "by_location": [],
            "time_of_day": [],
            "day_of_week": [],
            "streak": {"current": 0, "longest": 0},
            "monthly_trend": [],
            "platform": {"total_sightings": all_count, "total_users": all_users},
        }

    from collections import Counter, defaultdict

    # Sightings over time (last 30 days)
    now = datetime.now(timezone.utc)
    daily_counts = defaultdict(int)
    for s in sightings:
        date_str = s.get("sighting_date", "")
        if date_str:
            daily_counts[date_str] += 1

    sightings_over_time = []
    for i in range(29, -1, -1):
        d = now - __import__('datetime').timedelta(days=i)
        ds = d.strftime("%Y-%m-%d")
        sightings_over_time.append({"date": ds, "count": daily_counts.get(ds, 0)})

    # Monthly trend (last 12 months)
    monthly_counts = defaultdict(int)
    for s in sightings:
        date_str = s.get("sighting_date", "")
        if len(date_str) >= 7:
            monthly_counts[date_str[:7]] += 1
    monthly_trend = []
    for i in range(11, -1, -1):
        d = now - __import__('datetime').timedelta(days=i * 30)
        ms = d.strftime("%Y-%m")
        monthly_trend.append({"month": ms, "count": monthly_counts.get(ms, 0)})

    # Breakdowns
    by_train_type = [{"name": k, "count": v} for k, v in Counter(s.get("train_type", "Unknown") for s in sightings).most_common(10)]
    by_traction_type = [{"name": k, "count": v} for k, v in Counter(s.get("traction_type", "Unknown") for s in sightings if s.get("traction_type")).most_common(10)]
    by_operator = [{"name": k, "count": v} for k, v in Counter(s.get("operator", "Unknown") for s in sightings).most_common(10)]
    by_location = [{"name": k, "count": v} for k, v in Counter(s.get("location", "Unknown") for s in sightings).most_common(10)]

    # Time of day distribution (hourly buckets)
    hour_counts = defaultdict(int)
    for s in sightings:
        t = s.get("sighting_time", "")
        if t and ":" in t:
            try:
                hour = int(t.split(":")[0])
                hour_counts[hour] += 1
            except ValueError:
                pass
    time_of_day = [{"hour": h, "label": f"{h:02d}:00", "count": hour_counts.get(h, 0)} for h in range(24)]

    # Day of week distribution
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    dow_counts = defaultdict(int)
    for s in sightings:
        date_str = s.get("sighting_date", "")
        if date_str:
            try:
                d = datetime.strptime(date_str, "%Y-%m-%d")
                dow_counts[d.weekday()] += 1
            except ValueError:
                pass
    day_of_week = [{"day": day_names[i], "count": dow_counts.get(i, 0)} for i in range(7)]

    # Streak calculation
    unique_dates = sorted(set(s.get("sighting_date", "") for s in sightings if s.get("sighting_date")), reverse=True)
    current_streak = 0
    longest_streak = 0
    streak = 0
    if unique_dates:
        today = now.strftime("%Y-%m-%d")
        yesterday = (now - __import__('datetime').timedelta(days=1)).strftime("%Y-%m-%d")
        # Current streak
        if unique_dates[0] in (today, yesterday):
            current_streak = 1
            for i in range(1, len(unique_dates)):
                prev = datetime.strptime(unique_dates[i - 1], "%Y-%m-%d")
                curr = datetime.strptime(unique_dates[i], "%Y-%m-%d")
                if (prev - curr).days == 1:
                    current_streak += 1
                else:
                    break
        # Longest streak
        sorted_asc = sorted(unique_dates)
        streak = 1
        longest_streak = 1
        for i in range(1, len(sorted_asc)):
            prev = datetime.strptime(sorted_asc[i - 1], "%Y-%m-%d")
            curr = datetime.strptime(sorted_asc[i], "%Y-%m-%d")
            if (curr - prev).days == 1:
                streak += 1
                longest_streak = max(longest_streak, streak)
            else:
                streak = 1

    return {
        "sightings_over_time": sightings_over_time,
        "monthly_trend": monthly_trend,
        "by_train_type": by_train_type,
        "by_traction_type": by_traction_type,
        "by_operator": by_operator,
        "by_location": by_location,
        "time_of_day": time_of_day,
        "day_of_week": day_of_week,
        "streak": {"current": current_streak, "longest": longest_streak},
        "platform": {"total_sightings": all_count, "total_users": all_users},
    }

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
