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
    return {"countries": sorted(countries), "supported": ["Australia"]}


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


# ── Seed Data ────────────────────────────────────────────────────

async def seed_australian_trains():
    """Seed the database with Australian train data if empty."""
    count = await db.trains.count_documents({"country": "Australia"})
    if count > 0:
        logger.info(f"Train database already has {count} Australian entries, skipping seed")
        return

    trains = get_australian_trains()
    for t in trains:
        t["train_id"] = f"train_{uuid.uuid4().hex[:12]}"
        t["created_at"] = datetime.now(timezone.utc)
    await db.trains.insert_many(trains)
    logger.info(f"Seeded {len(trains)} Australian trains")


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
                "manufacturer": "Downer Rail / Changchun Railway Vehicles",
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
                "number_built": 24,
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
            "status": "Testing",
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
                "number_built": 65,
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
