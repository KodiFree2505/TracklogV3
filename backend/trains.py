from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

trains_router = APIRouter(prefix="/trains", tags=["trains"])

db = None

def set_db(database):
    global db
    db = database


ADMIN_EMAILS = ["kodi055free@gmail.com", "tracklog-support@train-tracklog.com"]


async def get_current_user_id(request: Request) -> str:
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
    return session_doc["user_id"]


async def get_current_user(request: Request) -> dict:
    user_id = await get_current_user_id(request)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("email", "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Models ───────────────────────────────────────────────────────

class TrainSpec(BaseModel):
    manufacturer: Optional[str] = None
    year_introduced: Optional[str] = None
    year_retired: Optional[str] = None
    top_speed_kmh: Optional[int] = None
    capacity: Optional[int] = None
    power_type: Optional[str] = None
    axle_config: Optional[str] = None
    weight_tonnes: Optional[float] = None
    length_m: Optional[float] = None
    gauge_mm: Optional[int] = None
    acceleration: Optional[str] = None
    braking_distance: Optional[str] = None
    power_output_kw: Optional[int] = None
    number_built: Optional[int] = None
    formation: Optional[str] = None

class RouteInfo(BaseModel):
    name: str
    stations: List[str] = []
    coordinates: List[List[float]] = []  # [[lat, lng], ...]
    is_current: bool = True

class TrainCreate(BaseModel):
    name: str
    designation: Optional[str] = None
    country: str = "Australia"
    state: Optional[str] = None
    operator: str
    train_type: str
    status: str = "In Service"
    description: Optional[str] = None
    specs: Optional[TrainSpec] = None
    livery: Optional[List[dict]] = None
    routes: Optional[List[dict]] = None
    history: Optional[List[dict]] = None
    image_url: Optional[str] = None

class SuggestionCreate(BaseModel):
    train_id: Optional[str] = None
    suggestion_type: str  # "new_train" or "edit"
    data: dict
    notes: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────

@trains_router.get("/countries")
async def get_countries(request: Request):
    await get_current_user_id(request)
    countries = await db.trains.distinct("country")
    return {"countries": sorted(countries), "supported": sorted(countries)}


@trains_router.get("/list")
async def list_trains(request: Request, country: str = "Australia", state: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None):
    await get_current_user_id(request)
    query = {"country": country}
    if state:
        query["state"] = state
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"designation": {"$regex": search, "$options": "i"}},
            {"operator": {"$regex": search, "$options": "i"}},
        ]
    trains = await db.trains.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return {"trains": trains}


@trains_router.get("/states")
async def get_states(request: Request, country: str = "Australia"):
    await get_current_user_id(request)
    states = await db.trains.distinct("state", {"country": country})
    return {"states": sorted([s for s in states if s])}


@trains_router.get("/{train_id}")
async def get_train(train_id: str, request: Request):
    await get_current_user_id(request)
    train = await db.trains.find_one({"train_id": train_id}, {"_id": 0})
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    return train


# ── Suggestions ──────────────────────────────────────────────────

@trains_router.post("/suggestions")
async def create_suggestion(data: SuggestionCreate, request: Request):
    user_id = await get_current_user_id(request)
    suggestion = {
        "suggestion_id": f"sug_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "train_id": data.train_id,
        "suggestion_type": data.suggestion_type,
        "data": data.data,
        "notes": data.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    await db.train_suggestions.insert_one(suggestion)
    return {"message": "Suggestion submitted for review", "suggestion_id": suggestion["suggestion_id"]}


@trains_router.get("/suggestions/mine")
async def my_suggestions(request: Request):
    user_id = await get_current_user_id(request)
    suggestions = await db.train_suggestions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"suggestions": suggestions}


# ── Admin Endpoints ──────────────────────────────────────────────

@trains_router.get("/admin/is-admin")
async def check_admin(request: Request):
    user = await get_current_user(request)
    is_admin = user.get("email", "").lower() in ADMIN_EMAILS
    return {"is_admin": is_admin}


@trains_router.get("/admin/suggestions")
async def admin_list_suggestions(request: Request, status: str = "pending"):
    await require_admin(request)
    query = {}
    if status:
        query["status"] = status
    suggestions = await db.train_suggestions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Attach user info
    for s in suggestions:
        user = await db.users.find_one({"user_id": s["user_id"]}, {"_id": 0, "password_hash": 0})
        s["user_name"] = user.get("name", "Unknown") if user else "Unknown"
        s["user_email"] = user.get("email", "") if user else ""
    return {"suggestions": suggestions}


class SuggestionAction(BaseModel):
    action: str  # "approve" or "reject"
    admin_notes: Optional[str] = None

@trains_router.put("/admin/suggestions/{suggestion_id}")
async def admin_action_suggestion(suggestion_id: str, data: SuggestionAction, request: Request):
    await require_admin(request)
    suggestion = await db.train_suggestions.find_one({"suggestion_id": suggestion_id}, {"_id": 0})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    if data.action == "approve":
        if suggestion["suggestion_type"] == "new_train":
            train_data = suggestion["data"]
            train_data["train_id"] = f"train_{uuid.uuid4().hex[:12]}"
            train_data["created_at"] = datetime.now(timezone.utc)
            train_data.setdefault("country", "Australia")
            train_data.setdefault("status", "In Service")
            await db.trains.insert_one(train_data)

        elif suggestion["suggestion_type"] == "edit" and suggestion.get("train_id"):
            update_data = {k: v for k, v in suggestion["data"].items() if v is not None}
            if update_data:
                await db.trains.update_one({"train_id": suggestion["train_id"]}, {"$set": update_data})

        await db.train_suggestions.update_one(
            {"suggestion_id": suggestion_id},
            {"$set": {"status": "approved", "admin_notes": data.admin_notes, "actioned_at": datetime.now(timezone.utc)}}
        )
        return {"message": "Suggestion approved and applied"}

    elif data.action == "reject":
        await db.train_suggestions.update_one(
            {"suggestion_id": suggestion_id},
            {"$set": {"status": "rejected", "admin_notes": data.admin_notes, "actioned_at": datetime.now(timezone.utc)}}
        )
        return {"message": "Suggestion rejected"}

    raise HTTPException(status_code=400, detail="Invalid action")


@trains_router.post("/admin/trains")
async def admin_create_train(data: TrainCreate, request: Request):
    await require_admin(request)
    train = data.dict()
    train["train_id"] = f"train_{uuid.uuid4().hex[:12]}"
    train["created_at"] = datetime.now(timezone.utc)
    await db.trains.insert_one(train)
    return {"message": "Train created", "train_id": train["train_id"]}


@trains_router.put("/admin/trains/{train_id}")
async def admin_update_train(train_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    body.pop("_id", None)
    body.pop("train_id", None)
    result = await db.trains.update_one({"train_id": train_id}, {"$set": body})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Train not found")
    return {"message": "Train updated"}


@trains_router.delete("/admin/trains/{train_id}")
async def admin_delete_train(train_id: str, request: Request):
    await require_admin(request)
    result = await db.trains.delete_one({"train_id": train_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Train not found")
    return {"message": "Train deleted"}


# ── Seed Data ────────────────────────────────────────────────────

async def seed_australian_trains():
    """Seed the database with train data if empty."""
    count = await db.trains.count_documents({})
    if count > 0:
        logger.info(f"Train database already has {count} entries, skipping seed")
        return

    all_trains = get_australian_trains() + get_uk_trains() + get_us_trains()
    for t in all_trains:
        t["train_id"] = f"train_{uuid.uuid4().hex[:12]}"
        t["created_at"] = datetime.now(timezone.utc)
    await db.trains.insert_many(all_trains)
    logger.info(f"Seeded {len(all_trains)} trains (AU/UK/US)")

async def migrate_vset_xpt_split(database):
    """One-time migration: split old 'V Set (XPT)' into separate V Set and XPT entries."""
    old_entry = await database.trains.find_one({"name": "V Set (XPT)"})
    if not old_entry:
        return  # Already migrated or never had the old entry

    logger.info("Migrating V Set / XPT split...")

    # Update the old entry to be the V Set (electric EMU)
    await database.trains.update_one({"name": "V Set (XPT)"}, {"$set": {
        "name": "V Set",
        "designation": "V Set",
        "operator": "NSW TrainLink",
        "train_type": "Electric Multiple Unit (Double-Deck)",
        "status": "Withdrawn",
        "description": "The V Sets were double-deck electric multiple units that operated NSW intercity services for 55 years (1970-2026). They served the Blue Mountains, Central Coast, Newcastle, and South Coast lines before being replaced by the Mariyung D Sets.",
        "specs": {
            "manufacturer": "Comeng",
            "year_introduced": "1970",
            "year_retired": "2026",
            "top_speed_kmh": 115,
            "capacity": 900,
            "power_type": "Electric (1500V DC)",
            "weight_tonnes": 50,
            "length_m": 24.0,
            "gauge_mm": 1435,
            "number_built": 225,
            "formation": "4-car / 8-car sets (225 total cars)"
        },
        "livery": [
            {"name": "Original Blue & White", "description": "Blue and white SRA livery", "is_current": False},
            {"name": "CityRail Blue", "description": "CityRail blue and yellow livery", "is_current": False},
            {"name": "NSW TrainLink Blue & Yellow", "description": "Blue and yellow NSW TrainLink intercity livery with Bush Plum interior", "is_current": True},
        ],
        "routes": [
            {"name": "Central Coast & Newcastle Line", "stations": ["Central", "Hornsby", "Gosford", "Wyong", "Newcastle"], "is_current": False, "coordinates": [[-33.8833, 151.2060], [-33.7030, 151.0990], [-33.4249, 151.3420], [-33.2817, 151.4230], [-32.9272, 151.7764]]},
            {"name": "Blue Mountains Line", "stations": ["Central", "Strathfield", "Penrith", "Springwood", "Katoomba", "Lithgow"], "is_current": False, "coordinates": [[-33.8833, 151.2060], [-33.8742, 151.0940], [-33.7506, 150.6943], [-33.6988, 150.5630], [-33.7314, 150.3120], [-33.4907, 150.1570]]},
            {"name": "South Coast Line", "stations": ["Central", "Hurstville", "Sutherland", "Wollongong", "Kiama"], "is_current": False, "coordinates": [[-33.8833, 151.2060], [-33.9668, 151.1004], [-34.0312, 151.0572], [-34.4240, 150.8930], [-34.6710, 150.8540]]},
        ],
        "history": [
            {"year": "1970", "event": "First V Set cars built by Comeng, entered service on intercity routes"},
            {"year": "1989", "event": "Final V Set cars delivered (225 total cars over two decades)"},
            {"year": "2013", "event": "Interior refurbishment with Bush Plum themed upholstery"},
            {"year": "2024", "event": "Replacement by Mariyung D Sets commenced"},
            {"year": "2025", "event": "Withdrawn from Central Coast & Newcastle Line (27 Jun)"},
            {"year": "2026", "event": "Final V Set service, Lithgow to Central (30 Jan). 55 years of service ended"},
        ],
    }})

    # Check if XPT already exists
    existing_xpt = await database.trains.find_one({"name": "XPT (eXpress Passenger Train)"})
    if not existing_xpt:
        await database.trains.insert_one({
            "train_id": f"train_{uuid.uuid4().hex[:12]}",
            "name": "XPT (eXpress Passenger Train)",
            "designation": "XPT / X Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "NSW TrainLink",
            "train_type": "Diesel-Electric Express",
            "status": "In Service",
            "description": "The XPT (eXpress Passenger Train) is based on the British HST/InterCity 125 design. It has served NSW long-distance regional and interstate routes since 1982. Currently undergoing a life extension program to continue service while replacement plans are developed.",
            "specs": {
                "manufacturer": "Comeng / ABB",
                "year_introduced": "1982",
                "top_speed_kmh": 160,
                "capacity": 320,
                "power_type": "Diesel-Electric (Paxman VP185)",
                "axle_config": "Bo-Bo (power cars)",
                "weight_tonnes": 78,
                "length_m": 17.35,
                "gauge_mm": 1435,
                "power_output_kw": 1492,
                "number_built": 19,
                "formation": "Power Car + 5-6 Coaches + Power Car (7 sets)"
            },
            "livery": [
                {"name": "Original Indian Pacific Blue", "description": "Dark blue with white stripe and Indian Pacific branding", "is_current": False},
                {"name": "CountryLink Green & Yellow", "description": "Green body with yellow stripe and CountryLink logo", "is_current": False},
                {"name": "NSW TrainLink Blue & White", "description": "Updated blue and white NSW TrainLink livery", "is_current": True},
            ],
            "routes": [
                {"name": "Sydney to Melbourne", "stations": ["Central", "Campbelltown", "Goulburn", "Canberra", "Albury", "Southern Cross"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-34.0654, 150.8142], [-34.7515, 149.7209], [-35.2809, 149.1300], [-36.0808, 146.9161], [-37.8183, 144.9528]]},
                {"name": "Sydney to Brisbane", "stations": ["Central", "Maitland", "Coffs Harbour", "Casino", "Roma Street"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-32.7337, 151.5545], [-30.2963, 153.1138], [-28.8662, 153.0479], [-27.4658, 153.0188]]},
                {"name": "Sydney to Dubbo", "stations": ["Central", "Lithgow", "Orange", "Dubbo"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.4907, 150.1570], [-33.2836, 149.0995], [-32.2432, 148.6058]]},
                {"name": "Sydney to Grafton", "stations": ["Central", "Maitland", "Taree", "Coffs Harbour", "Grafton"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-32.7337, 151.5545], [-31.9100, 152.4622], [-30.2963, 153.1138], [-29.6917, 152.9333]]},
            ],
            "history": [
                {"year": "1981", "event": "First XPT power car built by Comeng at Granville"},
                {"year": "1982", "event": "Entered revenue service on Sydney-Melbourne route"},
                {"year": "1982", "event": "Set Australian rail speed record of 183 km/h during testing"},
                {"year": "1990", "event": "Fleet expanded for regional NSW services"},
                {"year": "2015", "event": "Some power cars re-engined with Paxman VP185 units"},
                {"year": "2025", "event": "XPT Life Extension Project commenced"},
                {"year": "2026", "event": "Sydney-Grafton XPT returned to service after refurbishment (28 Apr)"},
            ],
            "image_url": None,
            "created_at": datetime.now(timezone.utc),
        })

    logger.info("V Set / XPT migration complete")



def get_australian_trains():
    return [
        # ── NSW / Sydney Trains ──────────────────────────
        {
            "name": "Waratah A Set",
            "designation": "A Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "Sydney Trains",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "The Waratah is Sydney's most common suburban train, introduced in 2011. Named after the NSW floral emblem, these reliable 8-car sets operate across most Sydney Trains lines.",
            "specs": {
                "manufacturer": "Reliance Rail (Downer/Changchun JV)",
                "year_introduced": "2011",
                "top_speed_kmh": 130,
                "capacity": 896,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 370,
                "length_m": 163.4,
                "gauge_mm": 1435,
                "power_output_kw": 4800,
                "number_built": 78,
                "formation": "8-car (T-M-T-M-M-T-M-T)"
            },
            "livery": [
                {"name": "Standard Yellow & Grey", "description": "Yellow doors with grey body and Sydney Trains branding", "is_current": True},
            ],
            "routes": [
                {"name": "T1 North Shore & Western Line", "stations": ["Tallawong", "Macquarie Park", "Chatswood", "North Sydney", "Central", "Parramatta", "Penrith"], "is_current": True, "coordinates": [[-33.7075, 150.9693], [-33.7764, 151.1173], [-33.7980, 151.1810], [-33.8398, 151.2073], [-33.8833, 151.2060], [-33.8151, 151.0012], [-33.7506, 150.6943]]},
                {"name": "T2 Inner West & Leppington Line", "stations": ["City Circle", "Sydenham", "Bankstown", "Liverpool", "Leppington"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.9173, 151.1639], [-33.9178, 151.0355], [-33.9268, 150.9237], [-33.9640, 150.8107]]},
                {"name": "T3 Bankstown Line", "stations": ["Central", "Sydenham", "Bankstown"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.9173, 151.1639], [-33.9178, 151.0355]]},
                {"name": "T4 Eastern Suburbs & Illawarra Line", "stations": ["Bondi Junction", "Central", "Hurstville", "Cronulla"], "is_current": True, "coordinates": [[-33.8911, 151.2479], [-33.8833, 151.2060], [-33.9668, 151.1004], [-34.0548, 151.1518]]},
            ],
            "history": [
                {"year": "2006", "event": "Contract awarded to Downer/Changchun consortium"},
                {"year": "2011", "event": "First set entered service on T4 Line"},
                {"year": "2014", "event": "Full fleet delivered and operational"},
            ],
            "image_url": None,
        },
        {
            "name": "Waratah Series 2 (B Set)",
            "designation": "B Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "Sydney Trains",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "An updated version of the original Waratah, the Series 2 features improved passenger information displays, USB charging ports, and enhanced accessibility.",
            "specs": {
                "manufacturer": "Downer Rail / CRRC Changchun",
                "year_introduced": "2018",
                "top_speed_kmh": 130,
                "capacity": 896,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 370,
                "length_m": 163.4,
                "gauge_mm": 1435,
                "power_output_kw": 4800,
                "number_built": 41,
                "formation": "8-car (T-M-T-M-M-T-M-T)"
            },
            "livery": [
                {"name": "Standard Yellow & Grey", "description": "Yellow doors with grey body, updated interior", "is_current": True},
            ],
            "routes": [
                {"name": "T1 North Shore & Western Line", "stations": ["Tallawong", "Central", "Penrith"], "is_current": True, "coordinates": [[-33.7075, 150.9693], [-33.8833, 151.2060], [-33.7506, 150.6943]]},
                {"name": "T8 Airport & South Line", "stations": ["Central", "Airport", "Macarthur"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.9399, 151.1666], [-34.0666, 150.8160]]},
            ],
            "history": [
                {"year": "2016", "event": "Order placed for 24 additional sets"},
                {"year": "2018", "event": "First Series 2 set entered service"},
                {"year": "2019", "event": "Full fleet delivered"},
            ],
            "image_url": None,
        },
        {
            "name": "Mariyung (D Set)",
            "designation": "D Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "Sydney Trains / NSW TrainLink",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "The Mariyung (meaning 'emu' in the Darug language) is the New Intercity Fleet replacing V Sets on intercity services. Features airline-style seating, Wi-Fi, and power outlets.",
            "specs": {
                "manufacturer": "Hyundai Rotem",
                "year_introduced": "2023",
                "top_speed_kmh": 160,
                "capacity": 650,
                "power_type": "Electric (1500V DC / 25kV AC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 340,
                "length_m": 163,
                "gauge_mm": 1435,
                "power_output_kw": 5600,
                "number_built": 55,
                "formation": "10-car"
            },
            "livery": [
                {"name": "Blue & White Intercity", "description": "Dark blue and white livery with NSW TrainLink branding", "is_current": True},
            ],
            "routes": [
                {"name": "South Coast Line", "stations": ["Central", "Hurstville", "Wollongong", "Kiama"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.9668, 151.1004], [-34.4240, 150.8930], [-34.6710, 150.8540]]},
                {"name": "Central Coast & Newcastle Line", "stations": ["Central", "Hornsby", "Gosford", "Newcastle"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.7030, 151.0990], [-33.4249, 151.3420], [-32.9272, 151.7764]]},
                {"name": "Blue Mountains Line", "stations": ["Central", "Penrith", "Katoomba", "Lithgow"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.7506, 150.6943], [-33.7314, 150.3120], [-33.4907, 150.1570]]},
            ],
            "history": [
                {"year": "2014", "event": "NSW Government announced New Intercity Fleet project"},
                {"year": "2016", "event": "Contract awarded to Hyundai Rotem"},
                {"year": "2019", "event": "First train rolled out in South Korea"},
                {"year": "2023", "event": "Service commenced on South Coast Line"},
            ],
            "image_url": None,
        },
        {
            "name": "V Set (XPT)",
            "designation": "V Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "NSW TrainLink",
            "train_type": "Diesel-Electric Express",
            "status": "Withdrawn",
            "description": "The XPT (eXpress Passenger Train) was based on the British HST/InterCity 125. It served NSW for over 40 years on long-distance intercity routes. Being progressively retired as D Sets take over.",
            "specs": {
                "manufacturer": "Comeng / Clyde Engineering (Licence from BR)",
                "year_introduced": "1982",
                "year_retired": "2025",
                "top_speed_kmh": 160,
                "capacity": 372,
                "power_type": "Diesel-Electric",
                "axle_config": "Bo-Bo (power cars)",
                "weight_tonnes": 70,
                "length_m": 17.7,
                "gauge_mm": 1435,
                "power_output_kw": 1490,
                "number_built": 19,
                "formation": "Power Car + 5-7 Coaches + Power Car"
            },
            "livery": [
                {"name": "Original Indian Pacific Blue", "description": "Dark blue with white stripe and Indian Pacific branding", "is_current": False},
                {"name": "CountryLink Green & Yellow", "description": "Green body with yellow stripe and CountryLink logo", "is_current": False},
                {"name": "NSW TrainLink Blue", "description": "Updated blue and white livery with NSW TrainLink branding", "is_current": True},
            ],
            "routes": [
                {"name": "Sydney to Melbourne", "stations": ["Central", "Campbelltown", "Goulburn", "Canberra", "Albury", "Southern Cross"], "is_current": False, "coordinates": [[-33.8833, 151.2060], [-34.0654, 150.8142], [-34.7515, 149.7209], [-35.2809, 149.1300], [-36.0808, 146.9161], [-37.8183, 144.9528]]},
                {"name": "Sydney to Brisbane", "stations": ["Central", "Maitland", "Coffs Harbour", "Casino", "Roma Street"], "is_current": False, "coordinates": [[-33.8833, 151.2060], [-32.7337, 151.5545], [-30.2963, 153.1138], [-28.8662, 153.0479], [-27.4658, 153.0188]]},
                {"name": "Sydney to Dubbo", "stations": ["Central", "Lithgow", "Orange", "Dubbo"], "is_current": False, "coordinates": [[-33.8833, 151.2060], [-33.4907, 150.1570], [-33.2836, 149.0995], [-32.2432, 148.6058]]},
            ],
            "history": [
                {"year": "1981", "event": "First XPT set built by Comeng at Granville"},
                {"year": "1982", "event": "Entered revenue service Sydney-Melbourne"},
                {"year": "1982", "event": "Set Australian rail speed record of 183 km/h"},
                {"year": "1990", "event": "Fleet expanded for regional NSW services"},
                {"year": "2023", "event": "Gradual withdrawal commenced as Mariyung enters service"},
                {"year": "2025", "event": "Final services and farewell runs"},
            ],
            "image_url": None,
        },
        {
            "name": "K Set",
            "designation": "K Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "Sydney Trains",
            "train_type": "Electric Multiple Unit",
            "status": "Withdrawn",
            "description": "The K Sets were refurbished from the original interurban cars dating back to the 1970s. They operated suburban services with their distinctive silver stainless steel exterior.",
            "specs": {
                "manufacturer": "Comeng / ABB (refurbished)",
                "year_introduced": "1988",
                "year_retired": "2025",
                "top_speed_kmh": 115,
                "capacity": 1100,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 400,
                "length_m": 163,
                "gauge_mm": 1435,
                "number_built": 35,
                "formation": "8-car"
            },
            "livery": [
                {"name": "Silver with Blue Stripe", "description": "Stainless steel body with blue stripe and CityRail branding", "is_current": False},
                {"name": "Sydney Trains Grey", "description": "Grey repaint with yellow doors and Sydney Trains livery", "is_current": True},
            ],
            "routes": [
                {"name": "T1 North Shore Line", "stations": ["Central", "North Sydney", "Chatswood", "Hornsby"], "is_current": False, "coordinates": [[-33.8833, 151.2060], [-33.8398, 151.2073], [-33.7980, 151.1810], [-33.7030, 151.0990]]},
                {"name": "T4 Illawarra Line", "stations": ["Central", "Hurstville", "Sutherland", "Cronulla"], "is_current": False, "coordinates": [[-33.8833, 151.2060], [-33.9668, 151.1004], [-34.0312, 151.0572], [-34.0548, 151.1518]]},
            ],
            "history": [
                {"year": "1970s", "event": "Original interurban cars built by Comeng"},
                {"year": "1988", "event": "Refurbished and designated as K Sets"},
                {"year": "2000", "event": "Interior refresh for Sydney Olympics"},
                {"year": "2020", "event": "Progressive withdrawal announced"},
                {"year": "2025", "event": "Final K Set withdrawn from service"},
            ],
            "image_url": None,
        },
        {
            "name": "Tangara (T Set)",
            "designation": "T Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "Sydney Trains",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "The Tangara (meaning 'to go' in the Dharug language) has been a Sydney icon since 1988. Known for its distinctive front cab design and reliable service.",
            "specs": {
                "manufacturer": "A Goninan & Co",
                "year_introduced": "1988",
                "top_speed_kmh": 130,
                "capacity": 893,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 298,
                "length_m": 140.5,
                "gauge_mm": 1435,
                "power_output_kw": 3160,
                "number_built": 70,
                "formation": "8-car (2x 4-car sets)"
            },
            "livery": [
                {"name": "Original Blue & Yellow", "description": "CityRail blue with yellow front and stripe", "is_current": False},
                {"name": "Sydney Trains Grey & Yellow", "description": "Grey body with yellow doors", "is_current": True},
            ],
            "routes": [
                {"name": "T1 Western Line", "stations": ["Central", "Strathfield", "Parramatta", "Blacktown", "Penrith"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.8742, 151.0940], [-33.8151, 151.0012], [-33.7688, 150.9063], [-33.7506, 150.6943]]},
                {"name": "T2 Inner West Line", "stations": ["Central", "Newtown", "Ashfield", "Homebush"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.8974, 151.1793], [-33.8872, 151.1257], [-33.8656, 151.0822]]},
            ],
            "history": [
                {"year": "1988", "event": "First Tangara entered service for Bicentenary"},
                {"year": "1995", "event": "Full fleet of 70 sets delivered"},
                {"year": "2012", "event": "Major refurbishment program commenced"},
                {"year": "2020s", "event": "Gradual replacement by newer fleets planned"},
            ],
            "image_url": None,
        },
        {
            "name": "Millennium (M Set)",
            "designation": "M Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "Sydney Trains",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "Introduced for the Sydney 2000 Olympics, the Millennium train features wider doors, improved air conditioning, and was the first Sydney train with CCTV.",
            "specs": {
                "manufacturer": "Downer EDI Rail / ADtranz",
                "year_introduced": "2002",
                "top_speed_kmh": 130,
                "capacity": 896,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 344,
                "length_m": 163.4,
                "gauge_mm": 1435,
                "power_output_kw": 3920,
                "number_built": 35,
                "formation": "8-car (T-M-T-M-M-T-M-T)"
            },
            "livery": [
                {"name": "Sydney Trains Grey & Yellow", "description": "Standard grey body with yellow doors", "is_current": True},
            ],
            "routes": [
                {"name": "T1 North Shore Line", "stations": ["Central", "North Sydney", "Chatswood", "Hornsby"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.8398, 151.2073], [-33.7980, 151.1810], [-33.7030, 151.0990]]},
            ],
            "history": [
                {"year": "1999", "event": "First set completed for Olympic preparation"},
                {"year": "2002", "event": "Full fleet entered service"},
                {"year": "2015", "event": "Interior refresh program"},
            ],
            "image_url": None,
        },
        {
            "name": "OSCAR (H Set)",
            "designation": "H Set",
            "country": "Australia",
            "state": "New South Wales",
            "operator": "Sydney Trains",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "The Outer Suburban Car (OSCAR) was designed for longer-distance suburban and intercity commuter services with 2+3 seating configuration.",
            "specs": {
                "manufacturer": "Downer EDI Rail / United Group",
                "year_introduced": "2007",
                "top_speed_kmh": 130,
                "capacity": 900,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 290,
                "length_m": 133.4,
                "gauge_mm": 1435,
                "power_output_kw": 2600,
                "number_built": 56,
                "formation": "4-car (operated as 8-car pairs)"
            },
            "livery": [
                {"name": "Sydney Trains Grey & Yellow", "description": "Grey with yellow doors", "is_current": True},
            ],
            "routes": [
                {"name": "T4 Illawarra Line", "stations": ["Central", "Hurstville", "Sutherland", "Waterfall"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-33.9668, 151.1004], [-34.0312, 151.0572], [-34.1348, 150.9958]]},
                {"name": "South Coast Line", "stations": ["Central", "Wollongong"], "is_current": True, "coordinates": [[-33.8833, 151.2060], [-34.4240, 150.8930]]},
            ],
            "history": [
                {"year": "2006", "event": "First OSCAR set delivered"},
                {"year": "2007", "event": "Entered revenue service"},
                {"year": "2013", "event": "All 56 sets delivered"},
            ],
            "image_url": None,
        },
        # ── Victoria / Melbourne ──────────────────────────
        {
            "name": "High Capacity Metro Train (HCMT)",
            "designation": "HCMT",
            "country": "Australia",
            "state": "Victoria",
            "operator": "Metro Trains Melbourne",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "Melbourne's newest train, featuring wider doors, more standing room, real-time passenger information displays, and full accessibility compliance.",
            "specs": {
                "manufacturer": "CRRC Changchun / Downer Rail",
                "year_introduced": "2023",
                "top_speed_kmh": 130,
                "capacity": 1380,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 260,
                "length_m": 148,
                "gauge_mm": 1600,
                "power_output_kw": 4000,
                "number_built": 70,
                "formation": "7-car"
            },
            "livery": [
                {"name": "Metro Blue & Silver", "description": "Silver body with blue Metro Trains Melbourne branding and distinctive front", "is_current": True},
            ],
            "routes": [
                {"name": "Pakenham Line", "stations": ["Flinders Street", "Richmond", "Caulfield", "Dandenong", "Pakenham"], "is_current": True, "coordinates": [[-37.8183, 144.9671], [-37.8237, 144.9997], [-37.8754, 145.0227], [-37.9904, 145.2120], [-38.0770, 145.4870]]},
                {"name": "Cranbourne Line", "stations": ["Flinders Street", "Dandenong", "Cranbourne"], "is_current": True, "coordinates": [[-37.8183, 144.9671], [-37.9904, 145.2120], [-38.0991, 145.2830]]},
            ],
            "history": [
                {"year": "2017", "event": "Contract awarded to Evolution Rail consortium"},
                {"year": "2019", "event": "First train rolled out at Newport factory"},
                {"year": "2023", "event": "Entered passenger service on Cranbourne/Pakenham lines"},
            ],
            "image_url": None,
        },
        {
            "name": "X'Trapolis 100",
            "designation": "X'Trapolis",
            "country": "Australia",
            "state": "Victoria",
            "operator": "Metro Trains Melbourne",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "The X'Trapolis fleet is one of Melbourne's most modern suburban trains, featuring air conditioning and wide gangways between cars.",
            "specs": {
                "manufacturer": "Alstom",
                "year_introduced": "2002",
                "top_speed_kmh": 130,
                "capacity": 798,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 204,
                "length_m": 125.4,
                "gauge_mm": 1600,
                "power_output_kw": 2800,
                "number_built": 106,
                "formation": "6-car (3x 2-car units)"
            },
            "livery": [
                {"name": "Metro Blue & Silver", "description": "Silver with Metro Trains Melbourne blue trim", "is_current": True},
            ],
            "routes": [
                {"name": "Hurstbridge Line", "stations": ["Flinders Street", "Clifton Hill", "Heidelberg", "Eltham", "Hurstbridge"], "is_current": True, "coordinates": [[-37.8183, 144.9671], [-37.7881, 144.9954], [-37.7534, 145.0616], [-37.7138, 145.1481], [-37.6370, 145.1960]]},
                {"name": "Glen Waverley Line", "stations": ["Flinders Street", "Richmond", "Glen Waverley"], "is_current": True, "coordinates": [[-37.8183, 144.9671], [-37.8237, 144.9997], [-37.8781, 145.1629]]},
            ],
            "history": [
                {"year": "2002", "event": "First X'Trapolis entered service"},
                {"year": "2014", "event": "Additional order placed for 20 sets"},
                {"year": "2018", "event": "Fleet of 106 units complete"},
            ],
            "image_url": None,
        },
        {
            "name": "Comeng",
            "designation": "Comeng",
            "country": "Australia",
            "state": "Victoria",
            "operator": "Metro Trains Melbourne",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "The oldest trains still in Melbourne's suburban fleet, the Comeng units have served the network since 1981. Being progressively replaced by HCMTs.",
            "specs": {
                "manufacturer": "Commonwealth Engineering",
                "year_introduced": "1981",
                "top_speed_kmh": 115,
                "capacity": 798,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 207,
                "length_m": 125.4,
                "gauge_mm": 1600,
                "power_output_kw": 1600,
                "number_built": 116,
                "formation": "6-car (3x 2-car units)"
            },
            "livery": [
                {"name": "Metro Blue & Silver", "description": "Silver stainless steel with Metro blue accents", "is_current": True},
                {"name": "Original MET Brown", "description": "Original brown MET livery", "is_current": False},
            ],
            "routes": [
                {"name": "Multiple Melbourne suburban lines", "stations": ["Flinders Street", "Various"], "is_current": True, "coordinates": [[-37.8183, 144.9671]]},
            ],
            "history": [
                {"year": "1981", "event": "First Comeng units entered service"},
                {"year": "1990s", "event": "Interior refurbishment"},
                {"year": "2023", "event": "Progressive withdrawal as HCMTs arrive"},
            ],
            "image_url": None,
        },
        {
            "name": "Siemens Nexas",
            "designation": "Siemens",
            "country": "Australia",
            "state": "Victoria",
            "operator": "Metro Trains Melbourne",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "Modern German-built trains introduced in 2002, known for their smooth ride and distinctive appearance.",
            "specs": {
                "manufacturer": "Siemens",
                "year_introduced": "2002",
                "top_speed_kmh": 130,
                "capacity": 798,
                "power_type": "Electric (1500V DC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 210,
                "length_m": 125.4,
                "gauge_mm": 1600,
                "power_output_kw": 2400,
                "number_built": 36,
                "formation": "6-car (3x 2-car units)"
            },
            "livery": [
                {"name": "Metro Blue & Silver", "description": "Silver with blue Metro branding", "is_current": True},
            ],
            "routes": [
                {"name": "Multiple Melbourne lines", "stations": ["Flinders Street", "Various"], "is_current": True, "coordinates": [[-37.8183, 144.9671]]},
            ],
            "history": [
                {"year": "2002", "event": "Entered service"},
                {"year": "2006", "event": "Braking issues identified and rectified"},
            ],
            "image_url": None,
        },
        # ── Queensland ──────────────────────────────────
        {
            "name": "New Generation Rollingstock (NGR)",
            "designation": "NGR",
            "country": "Australia",
            "state": "Queensland",
            "operator": "Queensland Rail",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "Brisbane's newest suburban trains, featuring modern interiors with real-time displays and improved accessibility after significant modification.",
            "specs": {
                "manufacturer": "Bombardier / CRRC Sifang",
                "year_introduced": "2017",
                "top_speed_kmh": 140,
                "capacity": 964,
                "power_type": "Electric (25kV AC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 233,
                "length_m": 139.5,
                "gauge_mm": 1067,
                "power_output_kw": 3400,
                "number_built": 75,
                "formation": "6-car"
            },
            "livery": [
                {"name": "Queensland Rail Teal", "description": "Dark teal/green with QR branding", "is_current": True},
            ],
            "routes": [
                {"name": "Gold Coast / Airport Line", "stations": ["Roma Street", "South Brisbane", "Beenleigh", "Varsity Lakes"], "is_current": True, "coordinates": [[-27.4658, 153.0188], [-27.4785, 153.0174], [-27.6535, 153.1892], [-28.0840, 153.4198]]},
                {"name": "Ferny Grove Line", "stations": ["Roma Street", "Newmarket", "Ferny Grove"], "is_current": True, "coordinates": [[-27.4658, 153.0188], [-27.4310, 153.0030], [-27.3983, 152.9520]]},
            ],
            "history": [
                {"year": "2013", "event": "Contract awarded"},
                {"year": "2017", "event": "First NGR entered service"},
                {"year": "2019", "event": "Accessibility modifications commenced"},
            ],
            "image_url": None,
        },
        {
            "name": "Spirit of Queensland (Tilt Train)",
            "designation": "Tilt Train",
            "country": "Australia",
            "state": "Queensland",
            "operator": "Queensland Rail",
            "train_type": "Diesel Tilt Train",
            "status": "In Service",
            "description": "Long-distance tilting train connecting Brisbane to Cairns with premium railbed seating and entertainment systems.",
            "specs": {
                "manufacturer": "Bombardier",
                "year_introduced": "2013",
                "top_speed_kmh": 160,
                "capacity": 300,
                "power_type": "Diesel",
                "weight_tonnes": 400,
                "length_m": 193,
                "gauge_mm": 1067,
                "number_built": 5,
                "formation": "6-car"
            },
            "livery": [
                {"name": "Queensland Rail Maroon & Grey", "description": "Distinctive maroon and silver livery", "is_current": True},
            ],
            "routes": [
                {"name": "Brisbane to Cairns", "stations": ["Roma Street", "Bundaberg", "Rockhampton", "Mackay", "Townsville", "Cairns"], "is_current": True, "coordinates": [[-27.4658, 153.0188], [-24.8661, 152.3489], [-23.3790, 150.5100], [-21.1424, 149.1868], [-19.2564, 146.8183], [-16.9186, 145.7781]]},
            ],
            "history": [
                {"year": "2013", "event": "Spirit of Queensland entered service"},
                {"year": "2014", "event": "Full fleet operational Brisbane-Cairns"},
            ],
            "image_url": None,
        },
        # ── Western Australia / Perth ──────────────────
        {
            "name": "B-Series (Transperth)",
            "designation": "B-Series",
            "country": "Australia",
            "state": "Western Australia",
            "operator": "Transperth",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "The backbone of Perth's suburban network, the B-Series EMUs operate on all Transperth lines.",
            "specs": {
                "manufacturer": "Bombardier / Downer EDI",
                "year_introduced": "2004",
                "top_speed_kmh": 130,
                "capacity": 580,
                "power_type": "Electric (25kV AC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 144,
                "length_m": 72.6,
                "gauge_mm": 1067,
                "power_output_kw": 2000,
                "number_built": 93,
                "formation": "3-car"
            },
            "livery": [
                {"name": "Transperth Blue", "description": "Silver with Transperth blue livery", "is_current": True},
            ],
            "routes": [
                {"name": "Joondalup Line", "stations": ["Perth", "Leederville", "Joondalup", "Butler"], "is_current": True, "coordinates": [[-31.9505, 115.8605], [-31.9367, 115.8425], [-31.7458, 115.7665], [-31.6428, 115.7053]]},
                {"name": "Mandurah Line", "stations": ["Perth", "Cockburn", "Rockingham", "Mandurah"], "is_current": True, "coordinates": [[-31.9505, 115.8605], [-32.1193, 115.8454], [-32.2824, 115.7487], [-32.5234, 115.7474]]},
            ],
            "history": [
                {"year": "2004", "event": "First B-Series delivered"},
                {"year": "2007", "event": "Expanded fleet for Mandurah Line opening"},
            ],
            "image_url": None,
        },
        {
            "name": "C-Series (Transperth)",
            "designation": "C-Series",
            "country": "Australia",
            "state": "Western Australia",
            "operator": "Transperth",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "Perth's newest EMU fleet, designed for the expanding suburban network including the Forrestfield-Airport Link.",
            "specs": {
                "manufacturer": "CRRC Sifang / Downer",
                "year_introduced": "2022",
                "top_speed_kmh": 130,
                "capacity": 580,
                "power_type": "Electric (25kV AC)",
                "axle_config": "Bo-Bo",
                "weight_tonnes": 140,
                "length_m": 72.6,
                "gauge_mm": 1067,
                "power_output_kw": 2200,
                "number_built": 46,
                "formation": "3-car (operated as 6-car pairs)"
            },
            "livery": [
                {"name": "Transperth Blue", "description": "Updated silver with Transperth blue", "is_current": True},
            ],
            "routes": [
                {"name": "Airport Line", "stations": ["Perth", "Bayswater", "Airport Central", "High Wycombe"], "is_current": True, "coordinates": [[-31.9505, 115.8605], [-31.9178, 115.9141], [-31.9384, 115.9736], [-31.9487, 116.0076]]},
            ],
            "history": [
                {"year": "2019", "event": "Contract awarded"},
                {"year": "2022", "event": "First C-Series entered service"},
            ],
            "image_url": None,
        },
        # ── South Australia / Adelaide ────────────────
        {
            "name": "A-City 4000 Class",
            "designation": "4000 Class",
            "country": "Australia",
            "state": "South Australia",
            "operator": "Adelaide Metro",
            "train_type": "Diesel Multiple Unit",
            "status": "In Service",
            "description": "Adelaide's newest suburban trains, providing air-conditioned comfort across the Adelaide Metro network.",
            "specs": {
                "manufacturer": "Bombardier",
                "year_introduced": "2014",
                "top_speed_kmh": 130,
                "capacity": 280,
                "power_type": "Diesel",
                "weight_tonnes": 105,
                "length_m": 59,
                "gauge_mm": 1600,
                "number_built": 22,
                "formation": "3-car"
            },
            "livery": [
                {"name": "Adelaide Metro Purple & Silver", "description": "Silver with purple Adelaide Metro trim", "is_current": True},
            ],
            "routes": [
                {"name": "Gawler Line", "stations": ["Adelaide", "Salisbury", "Gawler"], "is_current": True, "coordinates": [[-34.9285, 138.6007], [-34.7586, 138.6419], [-34.5971, 138.7472]]},
                {"name": "Seaford Line", "stations": ["Adelaide", "Hallett Cove", "Seaford"], "is_current": True, "coordinates": [[-34.9285, 138.6007], [-35.0734, 138.5161], [-35.1880, 138.4863]]},
            ],
            "history": [
                {"year": "2014", "event": "First 4000 class entered service"},
                {"year": "2016", "event": "Full fleet operational"},
            ],
            "image_url": None,
        },
        # ── ACT / Canberra ───────────────────────────
        {
            "name": "Urbos 3 (Canberra Light Rail)",
            "designation": "Urbos 3",
            "country": "Australia",
            "state": "Australian Capital Territory",
            "operator": "Canberra Metro",
            "train_type": "Light Rail Vehicle",
            "status": "In Service",
            "description": "Canberra's first modern public transport rail service, connecting Gungahlin to the city centre.",
            "specs": {
                "manufacturer": "CAF (Spain)",
                "year_introduced": "2019",
                "top_speed_kmh": 70,
                "capacity": 207,
                "power_type": "Electric (750V DC overhead)",
                "weight_tonnes": 42,
                "length_m": 33,
                "gauge_mm": 1435,
                "number_built": 14,
                "formation": "Single articulated LRV"
            },
            "livery": [
                {"name": "Canberra Metro Green", "description": "Dark green with Canberra Metro branding", "is_current": True},
            ],
            "routes": [
                {"name": "Gungahlin to City", "stations": ["Gungahlin Place", "Mitchell", "EPIC", "Dickson", "Macarthur Avenue", "City South", "Alinga Street"], "is_current": True, "coordinates": [[-35.1855, 149.1326], [-35.2172, 149.1314], [-35.2424, 149.1322], [-35.2507, 149.1402], [-35.2656, 149.1374], [-35.2788, 149.1307], [-35.2803, 149.1296]]},
            ],
            "history": [
                {"year": "2016", "event": "Construction commenced"},
                {"year": "2019", "event": "Stage 1 opened Gungahlin to City"},
                {"year": "2024", "event": "Stage 2A to Commonwealth Park under construction"},
            ],
            "image_url": None,
        },
    ]


def get_uk_trains():
    return [
        {
            "name": "Class 395 Javelin",
            "designation": "Class 395",
            "country": "United Kingdom",
            "state": "England",
            "operator": "Southeastern",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "The UK's fastest domestic train, built for High Speed 1 services from London St Pancras to Kent. Used during the 2012 Olympics as the 'Javelin' shuttle.",
            "specs": {"manufacturer": "Hitachi", "year_introduced": "2009", "top_speed_kmh": 225, "capacity": 340, "power_type": "Electric (25kV AC)", "axle_config": "Bo-Bo", "weight_tonnes": 197, "length_m": 120, "gauge_mm": 1435, "power_output_kw": 2400, "number_built": 29, "formation": "6-car"},
            "livery": [{"name": "Southeastern Blue", "description": "Dark blue livery with Southeastern branding", "is_current": True}],
            "routes": [
                {"name": "HS1 London to Ashford", "stations": ["London St Pancras", "Stratford International", "Ebbsfleet", "Ashford International"], "is_current": True, "coordinates": [[51.5322, -0.1260], [51.5452, -0.0037], [51.4429, 0.3221], [51.1437, 0.8762]]},
                {"name": "HS1 to Margate", "stations": ["London St Pancras", "Ebbsfleet", "Canterbury West", "Margate"], "is_current": True, "coordinates": [[51.5322, -0.1260], [51.4429, 0.3221], [51.2800, 1.0756], [51.3862, 1.3867]]},
            ],
            "history": [
                {"year": "2005", "event": "Order placed with Hitachi for 29 sets"},
                {"year": "2009", "event": "Entered service on HS1 domestic routes"},
                {"year": "2012", "event": "Olympic Javelin shuttle service operated"},
            ],
            "image_url": None,
        },
        {
            "name": "Class 390 Pendolino",
            "designation": "Class 390",
            "country": "United Kingdom",
            "state": "England",
            "operator": "Avanti West Coast",
            "train_type": "Electric Tilting Train",
            "status": "In Service",
            "description": "Italy-designed tilting trains operating the West Coast Main Line, connecting London Euston to Birmingham, Manchester, Liverpool, and Glasgow.",
            "specs": {"manufacturer": "Alstom / Fiat Ferroviaria", "year_introduced": "2002", "top_speed_kmh": 200, "capacity": 439, "power_type": "Electric (25kV AC)", "axle_config": "Bo-Bo", "weight_tonnes": 471, "length_m": 235, "gauge_mm": 1435, "power_output_kw": 5100, "number_built": 56, "formation": "9-car / 11-car"},
            "livery": [
                {"name": "Virgin Trains Red", "description": "Red livery with Virgin Trains branding", "is_current": False},
                {"name": "Avanti West Coast Black", "description": "Black and orange Avanti West Coast livery", "is_current": True},
            ],
            "routes": [
                {"name": "London to Manchester", "stations": ["London Euston", "Milton Keynes", "Stoke-on-Trent", "Stockport", "Manchester Piccadilly"], "is_current": True, "coordinates": [[51.5284, -0.1338], [52.0345, -0.7574], [53.0027, -2.1794], [53.4060, -2.1624], [53.4774, -2.2309]]},
                {"name": "London to Glasgow", "stations": ["London Euston", "Birmingham", "Preston", "Carlisle", "Glasgow Central"], "is_current": True, "coordinates": [[51.5284, -0.1338], [52.4789, -1.9003], [53.7568, -2.7080], [54.8901, -2.9339], [55.8592, -4.2584]]},
            ],
            "history": [
                {"year": "2002", "event": "First Pendolino entered service with Virgin Trains"},
                {"year": "2012", "event": "Fleet expanded to 56 sets with 11-car variants"},
                {"year": "2019", "event": "Transferred to Avanti West Coast franchise"},
            ],
            "image_url": None,
        },
        {
            "name": "Class 800/801 Intercity Express (IET)",
            "designation": "Class 800/801",
            "country": "United Kingdom",
            "state": "England",
            "operator": "GWR / LNER",
            "train_type": "Bi-Mode / Electric Multiple Unit",
            "status": "In Service",
            "description": "Hitachi's Intercity Express Programme trains replacing the iconic HST. The Class 800 is bi-mode (electric/diesel), Class 801 is electric only. Operates on Great Western and East Coast main lines.",
            "specs": {"manufacturer": "Hitachi", "year_introduced": "2017", "top_speed_kmh": 200, "capacity": 596, "power_type": "Bi-Mode (25kV AC + Diesel)", "axle_config": "Bo-Bo", "weight_tonnes": 330, "length_m": 200, "gauge_mm": 1435, "power_output_kw": 3600, "number_built": 182, "formation": "5-car / 9-car"},
            "livery": [
                {"name": "GWR Green", "description": "Dark green Great Western Railway livery", "is_current": True},
                {"name": "LNER Red", "description": "Red LNER Azuma livery", "is_current": True},
            ],
            "routes": [
                {"name": "GWR London to Bristol/Cardiff", "stations": ["London Paddington", "Reading", "Swindon", "Bristol Temple Meads", "Cardiff Central"], "is_current": True, "coordinates": [[51.5160, -0.1764], [51.4589, -0.9717], [51.5651, -1.7854], [51.4493, -2.5813], [51.4753, -3.1791]]},
                {"name": "LNER London to Edinburgh", "stations": ["London King's Cross", "Peterborough", "York", "Newcastle", "Edinburgh Waverley"], "is_current": True, "coordinates": [[51.5320, -0.1240], [52.5750, -0.2505], [53.9583, -1.0930], [54.9685, -1.6173], [55.9522, -3.1891]]},
            ],
            "history": [
                {"year": "2012", "event": "IEP contract awarded to Hitachi-Agility consortium"},
                {"year": "2017", "event": "First GWR services launched London to Bristol"},
                {"year": "2019", "event": "LNER Azuma services commenced on East Coast"},
            ],
            "image_url": None,
        },
        {
            "name": "Class 43 HST (InterCity 125)",
            "designation": "Class 43",
            "country": "United Kingdom",
            "state": "England",
            "operator": "Various",
            "train_type": "Diesel-Electric High Speed",
            "status": "Withdrawn",
            "description": "The legendary InterCity 125, the world's fastest diesel train. It held the world speed record for diesel traction at 238 km/h (148 mph) set in 1987. Served British railways for over 40 years.",
            "specs": {"manufacturer": "BREL / Paxman", "year_introduced": "1976", "year_retired": "2025", "top_speed_kmh": 201, "capacity": 480, "power_type": "Diesel-Electric", "axle_config": "Bo-Bo (power cars)", "weight_tonnes": 70, "length_m": 17.8, "gauge_mm": 1435, "power_output_kw": 1680, "number_built": 197, "formation": "Power Car + 7-9 Mk3 Coaches + Power Car"},
            "livery": [
                {"name": "BR Blue/Grey InterCity", "description": "Original blue and grey InterCity livery", "is_current": False},
                {"name": "InterCity Swallow", "description": "Light grey with dark grey roof and swallow motif", "is_current": False},
                {"name": "GWR Green", "description": "Dark green GWR livery in final years", "is_current": True},
            ],
            "routes": [
                {"name": "East Coast Main Line", "stations": ["London King's Cross", "York", "Edinburgh Waverley"], "is_current": False, "coordinates": [[51.5320, -0.1240], [53.9583, -1.0930], [55.9522, -3.1891]]},
                {"name": "Great Western Main Line", "stations": ["London Paddington", "Bristol", "Swansea"], "is_current": False, "coordinates": [[51.5160, -0.1764], [51.4493, -2.5813], [51.6214, -3.9436]]},
            ],
            "history": [
                {"year": "1976", "event": "First HST set entered service on Western Region"},
                {"year": "1987", "event": "World diesel speed record set at 238 km/h"},
                {"year": "2002", "event": "Midland Mainline HSTs refurbished"},
                {"year": "2019", "event": "Withdrawal from GWR and LNER commenced"},
                {"year": "2023", "event": "Final regular HST service operated"},
            ],
            "image_url": None,
        },
        {
            "name": "Class 377 Electrostar",
            "designation": "Class 377",
            "country": "United Kingdom",
            "state": "England",
            "operator": "Southern / Thameslink",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "Bombardier's Electrostar family forms the backbone of commuter services across South East England.",
            "specs": {"manufacturer": "Bombardier Derby", "year_introduced": "2001", "top_speed_kmh": 160, "capacity": 340, "power_type": "Electric (750V DC / 25kV AC)", "axle_config": "Bo-Bo", "weight_tonnes": 178, "length_m": 80, "gauge_mm": 1435, "power_output_kw": 1500, "number_built": 239, "formation": "4-car / 5-car"},
            "livery": [{"name": "Southern Green", "description": "Green and white Southern livery", "is_current": True}],
            "routes": [
                {"name": "London Victoria to Brighton", "stations": ["London Victoria", "Gatwick Airport", "Brighton"], "is_current": True, "coordinates": [[51.4952, -0.1439], [51.1537, -0.1821], [50.8296, -0.1413]]},
            ],
            "history": [
                {"year": "2001", "event": "First Class 377 entered service"},
                {"year": "2014", "event": "Class 377/7 dual-voltage variant introduced"},
            ],
            "image_url": None,
        },
        {
            "name": "Class 345 Aventra (Elizabeth Line)",
            "designation": "Class 345",
            "country": "United Kingdom",
            "state": "England",
            "operator": "TfL / MTR Elizabeth Line",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "Purpose-built for London's Elizabeth line (Crossrail), these walk-through trains feature air conditioning, Wi-Fi, and real-time information displays.",
            "specs": {"manufacturer": "Bombardier / Alstom Derby", "year_introduced": "2017", "top_speed_kmh": 145, "capacity": 1500, "power_type": "Electric (25kV AC)", "axle_config": "Bo-Bo", "weight_tonnes": 300, "length_m": 205, "gauge_mm": 1435, "power_output_kw": 3360, "number_built": 70, "formation": "9-car"},
            "livery": [{"name": "Elizabeth Line Purple", "description": "White with purple Elizabeth line branding", "is_current": True}],
            "routes": [
                {"name": "Elizabeth Line", "stations": ["Reading", "Heathrow", "Paddington", "Liverpool Street", "Shenfield", "Abbey Wood"], "is_current": True, "coordinates": [[51.4589, -0.9717], [51.4700, -0.4543], [51.5160, -0.1764], [51.5178, -0.0823], [51.6300, 0.3289], [51.4907, 0.1203]]},
            ],
            "history": [
                {"year": "2014", "event": "Contract awarded to Bombardier"},
                {"year": "2017", "event": "First trains delivered for testing"},
                {"year": "2022", "event": "Elizabeth line opened through central London"},
            ],
            "image_url": None,
        },
        {
            "name": "Class 374 Eurostar e320",
            "designation": "Class 374",
            "country": "United Kingdom",
            "state": "England",
            "operator": "Eurostar",
            "train_type": "Electric High Speed",
            "status": "In Service",
            "description": "Siemens Velaro e320 trains operating through the Channel Tunnel connecting London, Paris, Brussels, and Amsterdam at up to 320 km/h.",
            "specs": {"manufacturer": "Siemens", "year_introduced": "2015", "top_speed_kmh": 320, "capacity": 900, "power_type": "Electric (25kV AC / 3kV DC / 1.5kV DC)", "axle_config": "Bo-Bo", "weight_tonnes": 450, "length_m": 200, "gauge_mm": 1435, "power_output_kw": 16000, "number_built": 17, "formation": "16-car (2x 8-car)"},
            "livery": [{"name": "Eurostar Yellow & White", "description": "White with yellow nose and Eurostar branding", "is_current": True}],
            "routes": [
                {"name": "London to Paris", "stations": ["London St Pancras", "Ashford International", "Lille Europe", "Paris Gare du Nord"], "is_current": True, "coordinates": [[51.5322, -0.1260], [51.1437, 0.8762], [50.6380, 3.0763], [48.8809, 2.3553]]},
                {"name": "London to Brussels", "stations": ["London St Pancras", "Brussels-Midi"], "is_current": True, "coordinates": [[51.5322, -0.1260], [50.8359, 4.3365]]},
            ],
            "history": [
                {"year": "2010", "event": "Order placed with Siemens for Velaro e320"},
                {"year": "2015", "event": "First e320 entered passenger service"},
                {"year": "2018", "event": "London to Amsterdam service launched"},
            ],
            "image_url": None,
        },
        {
            "name": "London Underground S Stock",
            "designation": "S Stock",
            "country": "United Kingdom",
            "state": "England",
            "operator": "Transport for London",
            "train_type": "Electric Multiple Unit (Metro)",
            "status": "In Service",
            "description": "Walk-through air-conditioned trains serving the Metropolitan, District, Circle, and Hammersmith & City lines. London's first sub-surface trains with air conditioning.",
            "specs": {"manufacturer": "Bombardier Derby", "year_introduced": "2010", "top_speed_kmh": 100, "capacity": 865, "power_type": "Electric (630V DC 4th rail)", "weight_tonnes": 183, "length_m": 117, "gauge_mm": 1435, "number_built": 191, "formation": "7-car / 8-car"},
            "livery": [{"name": "TfL Red & White", "description": "London Underground red, white, and blue livery", "is_current": True}],
            "routes": [
                {"name": "Metropolitan / District / Circle / H&C Lines", "stations": ["Various London Underground stations"], "is_current": True, "coordinates": [[51.5074, -0.1278]]},
            ],
            "history": [
                {"year": "2010", "event": "First S7 stock entered service on Metropolitan line"},
                {"year": "2014", "event": "S8 stock delivered for District and other lines"},
                {"year": "2017", "event": "Full fleet operational, replacing A/C/D stock"},
            ],
            "image_url": None,
        },
        {
            "name": "Class 158 Express Sprinter",
            "designation": "Class 158",
            "country": "United Kingdom",
            "state": "England",
            "operator": "Various",
            "train_type": "Diesel Multiple Unit",
            "status": "In Service",
            "description": "Versatile express DMUs used across the UK for regional and rural services by multiple operators including ScotRail, Northern, and Transport for Wales.",
            "specs": {"manufacturer": "BREL Derby", "year_introduced": "1989", "top_speed_kmh": 145, "capacity": 184, "power_type": "Diesel", "weight_tonnes": 76, "length_m": 47, "gauge_mm": 1435, "power_output_kw": 560, "number_built": 182, "formation": "2-car / 3-car"},
            "livery": [
                {"name": "ScotRail Saltire", "description": "ScotRail blue saltire livery", "is_current": True},
                {"name": "TfW Red", "description": "Transport for Wales red livery", "is_current": True},
            ],
            "routes": [
                {"name": "Various regional routes across UK", "stations": ["Various"], "is_current": True, "coordinates": [[53.4808, -2.2426]]},
            ],
            "history": [
                {"year": "1989", "event": "First Class 158 entered service"},
                {"year": "2000s", "event": "Multiple refurbishment programmes"},
            ],
            "image_url": None,
        },
    ]


def get_us_trains():
    return [
        {
            "name": "Amtrak Acela (Avelia Liberty)",
            "designation": "Acela",
            "country": "United States",
            "state": "Northeast Corridor",
            "operator": "Amtrak",
            "train_type": "Electric High Speed",
            "status": "In Service",
            "description": "America's only high-speed rail service, the new Avelia Liberty trainsets replaced the original Acela Express. Operating the Northeast Corridor between Boston and Washington DC.",
            "specs": {"manufacturer": "Alstom", "year_introduced": "2024", "top_speed_kmh": 257, "capacity": 386, "power_type": "Electric (12kV AC / 25kV AC)", "axle_config": "Bo-Bo", "weight_tonnes": 560, "length_m": 203, "gauge_mm": 1435, "power_output_kw": 9800, "number_built": 28, "formation": "Trainset (2 power cars + coaches)"},
            "livery": [{"name": "Amtrak Blue & Silver", "description": "Silver body with blue Amtrak striping and red accents", "is_current": True}],
            "routes": [
                {"name": "Northeast Corridor", "stations": ["Boston South", "Providence", "New Haven", "New York Penn", "Philadelphia 30th St", "Baltimore Penn", "Washington Union"], "is_current": True, "coordinates": [[42.3519, -71.0552], [41.8268, -71.4142], [41.2982, -72.9269], [40.7506, -73.9935], [39.9566, -75.1819], [39.3074, -76.6155], [38.8977, -77.0066]]},
            ],
            "history": [
                {"year": "2016", "event": "Amtrak ordered 28 Avelia Liberty trainsets from Alstom"},
                {"year": "2021", "event": "First trainset delivered for testing"},
                {"year": "2024", "event": "New Acela entered revenue service"},
            ],
            "image_url": None,
        },
        {
            "name": "Amtrak ALC-42 Charger",
            "designation": "ALC-42",
            "country": "United States",
            "state": "National",
            "operator": "Amtrak",
            "train_type": "Diesel-Electric Locomotive",
            "status": "In Service",
            "description": "Siemens Charger locomotives powering Amtrak's long-distance and state-supported corridor services. Replacing aging GE Genesis fleet.",
            "specs": {"manufacturer": "Siemens Mobility", "year_introduced": "2021", "top_speed_kmh": 201, "capacity": 0, "power_type": "Diesel-Electric", "axle_config": "Bo-Bo", "weight_tonnes": 123, "length_m": 21.8, "gauge_mm": 1435, "power_output_kw": 3134, "number_built": 75, "formation": "Single locomotive"},
            "livery": [{"name": "Amtrak Phase VII", "description": "Dark blue with red and white Amtrak striping", "is_current": True}],
            "routes": [
                {"name": "Various long-distance routes", "stations": ["Chicago Union", "Los Angeles Union", "New Orleans", "Seattle King Street"], "is_current": True, "coordinates": [[41.8786, -87.6400], [34.0561, -118.2365], [29.9452, -90.0783], [47.5992, -122.3309]]},
            ],
            "history": [
                {"year": "2018", "event": "Amtrak ordered 75 ALC-42 Charger locomotives"},
                {"year": "2021", "event": "First units delivered and entered service"},
            ],
            "image_url": None,
        },
        {
            "name": "R211 (NYC Subway)",
            "designation": "R211",
            "country": "United States",
            "state": "New York",
            "operator": "MTA New York City Transit",
            "train_type": "Electric Multiple Unit (Metro)",
            "status": "In Service",
            "description": "The newest subway cars for New York City, featuring wider doors for faster boarding, digital displays, and open gangways between cars.",
            "specs": {"manufacturer": "Kawasaki Heavy Industries", "year_introduced": "2023", "top_speed_kmh": 89, "capacity": 272, "power_type": "Electric (625V DC 3rd rail)", "weight_tonnes": 38, "length_m": 18.4, "gauge_mm": 1435, "number_built": 535, "formation": "5-car / 10-car"},
            "livery": [{"name": "MTA Silver", "description": "Stainless steel with blue MTA accents and digital destination signs", "is_current": True}],
            "routes": [
                {"name": "Various NYC Subway lines", "stations": ["Various NYC Subway stations"], "is_current": True, "coordinates": [[40.7580, -73.9855]]},
            ],
            "history": [
                {"year": "2018", "event": "Contract awarded to Kawasaki"},
                {"year": "2023", "event": "First R211 cars entered revenue service"},
            ],
            "image_url": None,
        },
        {
            "name": "BART Fleet of the Future",
            "designation": "Fleet of the Future",
            "country": "United States",
            "state": "California",
            "operator": "Bay Area Rapid Transit",
            "train_type": "Electric Multiple Unit (Metro)",
            "status": "In Service",
            "description": "BART's modern replacement fleet featuring wider aisles, bike spaces, USB charging, and real-time passenger information. Replacing legacy cars from the 1970s.",
            "specs": {"manufacturer": "Bombardier", "year_introduced": "2018", "top_speed_kmh": 129, "capacity": 378, "power_type": "Electric (1000V DC 3rd rail)", "weight_tonnes": 30, "length_m": 21.3, "gauge_mm": 1676, "number_built": 775, "formation": "Variable (up to 10-car)"},
            "livery": [{"name": "BART Silver & Blue", "description": "Silver with blue BART striping and LED displays", "is_current": True}],
            "routes": [
                {"name": "Bay Area network", "stations": ["San Francisco", "Oakland", "Berkeley", "Fremont", "SFO Airport", "Antioch"], "is_current": True, "coordinates": [[37.7749, -122.4194], [37.8044, -122.2712], [37.8716, -122.2727], [37.5585, -121.9791], [37.6213, -122.3790], [38.0049, -121.8058]]},
            ],
            "history": [
                {"year": "2012", "event": "BART Board approved Fleet of the Future procurement"},
                {"year": "2018", "event": "First cars entered revenue service"},
                {"year": "2023", "event": "Over 500 cars delivered and operational"},
            ],
            "image_url": None,
        },
        {
            "name": "Amtrak Superliner",
            "designation": "Superliner",
            "country": "United States",
            "state": "National",
            "operator": "Amtrak",
            "train_type": "Bi-Level Passenger Coach",
            "status": "In Service",
            "description": "Double-deck passenger coaches used on Amtrak's western long-distance routes including the California Zephyr, Coast Starlight, and Empire Builder.",
            "specs": {"manufacturer": "Pullman-Standard / Bombardier", "year_introduced": "1979", "top_speed_kmh": 160, "capacity": 78, "power_type": "Locomotive-hauled", "weight_tonnes": 70, "length_m": 25.9, "gauge_mm": 1435, "number_built": 284, "formation": "Various consist lengths"},
            "livery": [
                {"name": "Amtrak Phase IV", "description": "Silver with red, white, and blue stripes", "is_current": False},
                {"name": "Amtrak Phase VII", "description": "Updated blue and silver Amtrak livery", "is_current": True},
            ],
            "routes": [
                {"name": "California Zephyr", "stations": ["Chicago", "Denver", "Salt Lake City", "Sacramento", "Emeryville"], "is_current": True, "coordinates": [[41.8786, -87.6400], [39.7392, -104.9903], [40.7608, -111.8910], [38.5816, -121.4944], [37.8413, -122.2979]]},
                {"name": "Coast Starlight", "stations": ["Seattle", "Portland", "Sacramento", "San Jose", "Los Angeles"], "is_current": True, "coordinates": [[47.5992, -122.3309], [45.5122, -122.6765], [38.5816, -121.4944], [37.3318, -121.8863], [34.0561, -118.2365]]},
            ],
            "history": [
                {"year": "1979", "event": "First Superliner I coaches delivered by Pullman-Standard"},
                {"year": "1993", "event": "Superliner II coaches delivered by Bombardier"},
                {"year": "2010s", "event": "Interior refresh programs ongoing"},
            ],
            "image_url": None,
        },
        {
            "name": "Caltrain EMU (Stadler KISS)",
            "designation": "Stadler KISS",
            "country": "United States",
            "state": "California",
            "operator": "Caltrain",
            "train_type": "Electric Multiple Unit",
            "status": "In Service",
            "description": "Electric trains for the electrified Caltrain corridor between San Francisco and San Jose. Replacing diesel-hauled service with faster, quieter, zero-emission trains.",
            "specs": {"manufacturer": "Stadler Rail", "year_introduced": "2024", "top_speed_kmh": 177, "capacity": 741, "power_type": "Electric (25kV AC)", "weight_tonnes": 268, "length_m": 112, "gauge_mm": 1435, "power_output_kw": 6000, "number_built": 19, "formation": "6-car bi-level"},
            "livery": [{"name": "Caltrain Red & Silver", "description": "Silver with Caltrain red striping", "is_current": True}],
            "routes": [
                {"name": "San Francisco to San Jose", "stations": ["San Francisco 4th & King", "Millbrae", "Palo Alto", "San Jose Diridon"], "is_current": True, "coordinates": [[37.7764, -122.3942], [37.5997, -122.3867], [37.4439, -122.1649], [37.3297, -121.9020]]},
            ],
            "history": [
                {"year": "2019", "event": "Electrification project construction began"},
                {"year": "2022", "event": "First Stadler KISS trainset delivered"},
                {"year": "2024", "event": "Electric service testing commenced"},
            ],
            "image_url": None,
        },
        {
            "name": "Brightline (Siemens Venture)",
            "designation": "Brightline",
            "country": "United States",
            "state": "Florida",
            "operator": "Brightline",
            "train_type": "Diesel-Electric Express",
            "status": "In Service",
            "description": "America's first privately funded intercity rail in decades, connecting Miami to Orlando with premium service. Uses Siemens Venture coaches hauled by Charger locomotives.",
            "specs": {"manufacturer": "Siemens Mobility", "year_introduced": "2018", "top_speed_kmh": 201, "capacity": 240, "power_type": "Diesel-Electric", "weight_tonnes": 500, "length_m": 150, "gauge_mm": 1435, "number_built": 10, "formation": "Locomotive + 4-5 coaches + Locomotive"},
            "livery": [{"name": "Brightline Yellow & Blue", "description": "Vibrant yellow locomotives with blue coach interiors", "is_current": True}],
            "routes": [
                {"name": "Miami to Orlando", "stations": ["MiamiCentral", "Aventura", "Fort Lauderdale", "Boca Raton", "West Palm Beach", "Orlando"], "is_current": True, "coordinates": [[25.7959, -80.1897], [25.9607, -80.1422], [26.1196, -80.1375], [26.3584, -80.0831], [26.7173, -80.0531], [28.4272, -81.3818]]},
            ],
            "history": [
                {"year": "2018", "event": "Phase 1 service launched Miami to West Palm Beach"},
                {"year": "2023", "event": "Phase 2 service extended to Orlando"},
            ],
            "image_url": None,
        },
    ]
