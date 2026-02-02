from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
from auth import auth_router, set_db as set_auth_db
from sightings import sightings_router, set_db as set_sightings_db

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Set database for modules
set_auth_db(db)
set_sightings_db(db)

# Ensure uploads directory exists
os.makedirs(ROOT_DIR / "uploads", exist_ok=True)

# -------------------------
# CREATE APP FIRST
# -------------------------
app = FastAPI()

# -------------------------
# 🔥 CORS MUST BE HERE
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
    "http://localhost:3000",
    "https://localhost:3000",
    "https://rail-tracker-9.preview.emergentagent.com",
    "https://rail-tracker-9.emergent.host",
    "https://nsw-train-spotting.com"
],

    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# ROUTER SETUP
# -------------------------
api_router = APIRouter(prefix="/api")

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.dict())
    await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**s) for s in status_checks]

# Include sub-routers
api_router.include_router(auth_router)
api_router.include_router(sightings_router)

# Mount router
app.include_router(api_router)

# Static uploads
app.mount(
    "/api/uploads",
    StaticFiles(directory=str(ROOT_DIR / "uploads")),
    name="uploads",
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
