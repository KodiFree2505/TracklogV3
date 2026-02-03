import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from auth import auth_router, set_db as set_auth_db
from sightings import sightings_router, set_db as set_sightings_db

# --------------------------------------------------
# Paths & Env
# --------------------------------------------------
ROOT_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = ROOT_DIR / "uploads"

load_dotenv(ROOT_DIR / ".env")

# --------------------------------------------------
# Logging
# --------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("server")

# --------------------------------------------------
# App Lifecycle (Mongo)
# --------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")

    if not mongo_url or not db_name:
        raise RuntimeError("MONGO_URL or DB_NAME not set")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Inject DB into modules
    set_auth_db(db)
    set_sightings_db(db)

    logger.info(f"✅ Connected to MongoDB: {db_name}")
    yield

    client.close()
    logger.info("🛑 MongoDB connection closed")

# --------------------------------------------------
# FastAPI App
# --------------------------------------------------
app = FastAPI(
    title="Rail Tracker API",
    lifespan=lifespan,
)

api_router = APIRouter(prefix="/api")

# --------------------------------------------------
# Ensure uploads dir exists
# --------------------------------------------------
os.makedirs(UPLOADS_DIR, exist_ok=True)

# --------------------------------------------------
# Routers
# --------------------------------------------------
api_router.include_router(auth_router)
api_router.include_router(sightings_router)

app.include_router(api_router)

# --------------------------------------------------
# Static uploads
# --------------------------------------------------
app.mount(
    "/api/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads",
)

# --------------------------------------------------
# CORS (IMPORTANT FOR EMERGENT)
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://rail-tracker-9.preview.emergentagent.com",
        "https://rail-tracker-9.emergent.host",
        "https://nsw-train-spotting.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Health Check
# --------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}
