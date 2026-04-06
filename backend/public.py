from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

public_router = APIRouter(prefix="/public", tags=["public"])

db = None

def set_db(database):
    global db
    db = database

class PublicSightingResponse(BaseModel):
    sighting_id: str
    share_id: str
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
    created_at: datetime
    owner_name: str
    owner_picture: Optional[str] = None

class PublicProfileResponse(BaseModel):
    user_id: str
    name: str
    picture: Optional[str] = None
    total_sightings: int
    sightings: List[PublicSightingResponse] = []

@public_router.get("/sightings/{share_id}", response_model=PublicSightingResponse)
async def get_public_sighting(share_id: str):
    sighting = await db.sightings.find_one(
        {"share_id": share_id, "is_public": True}, {"_id": 0}
    )
    if not sighting:
        raise HTTPException(status_code=404, detail="Sighting not found or is private")

    user = await db.users.find_one(
        {"user_id": sighting["user_id"]}, {"_id": 0, "password_hash": 0}
    )
    owner_name = user["name"] if user else "Unknown"
    owner_picture = user.get("picture") if user else None

    return PublicSightingResponse(
        sighting_id=sighting["sighting_id"],
        share_id=sighting["share_id"],
        train_number=sighting["train_number"],
        train_type=sighting["train_type"],
        traction_type=sighting.get("traction_type"),
        operator=sighting["operator"],
        route=sighting.get("route"),
        location=sighting["location"],
        sighting_date=sighting["sighting_date"],
        sighting_time=sighting["sighting_time"],
        notes=sighting.get("notes"),
        photos=sighting.get("photos", []),
        created_at=sighting["created_at"],
        owner_name=owner_name,
        owner_picture=owner_picture,
    )

@public_router.get("/users/{user_id}", response_model=PublicProfileResponse)
async def get_public_profile(user_id: str):
    user = await db.users.find_one(
        {"user_id": user_id}, {"_id": 0, "password_hash": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.get("is_profile_public", False):
        raise HTTPException(status_code=403, detail="This profile is private")

    sightings = await db.sightings.find(
        {"user_id": user_id, "is_public": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    sighting_responses = []
    for s in sightings:
        sighting_responses.append(PublicSightingResponse(
            sighting_id=s["sighting_id"],
            share_id=s.get("share_id", ""),
            train_number=s["train_number"],
            train_type=s["train_type"],
            traction_type=s.get("traction_type"),
            operator=s["operator"],
            route=s.get("route"),
            location=s["location"],
            sighting_date=s["sighting_date"],
            sighting_time=s["sighting_time"],
            notes=s.get("notes"),
            photos=s.get("photos", []),
            created_at=s["created_at"],
            owner_name=user["name"],
            owner_picture=user.get("picture"),
        ))

    return PublicProfileResponse(
        user_id=user["user_id"],
        name=user["name"],
        picture=user.get("picture"),
        total_sightings=len(sighting_responses),
        sightings=sighting_responses,
    )
