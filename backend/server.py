import os
import asyncio
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
from public import public_router, set_db as set_public_db
from ai_summary import ai_router, set_db as set_ai_db
from social import social_router, set_db as set_social_db
from digest import digest_router, set_db as set_digest_db, send_digest_to_all

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
# Daily Digest Scheduler (4:00 PM AEST = 6:00 AM UTC)
# --------------------------------------------------
DIGEST_HOUR = 6  # 6:00 AM UTC = 4:00 PM AEST
DIGEST_MINUTE = 0

async def digest_scheduler():
    """Background loop that sends the daily digest at DIGEST_HOUR:DIGEST_MINUTE UTC (4:00 PM AEST)."""
    from datetime import datetime, timezone, timedelta
    logger.info(f"Digest scheduler started — will send daily at {DIGEST_HOUR:02d}:{DIGEST_MINUTE:02d} UTC")
    while True:
        now = datetime.now(timezone.utc)
        target = now.replace(hour=DIGEST_HOUR, minute=DIGEST_MINUTE, second=0, microsecond=0)
        if target <= now:
            target += timedelta(days=1)
        wait_seconds = (target - now).total_seconds()
        logger.info(f"Next digest in {wait_seconds/3600:.1f}h ({target.isoformat()})")
        await asyncio.sleep(wait_seconds)
        try:
            logger.info("Running scheduled daily digest...")
            count = await send_digest_to_all()
            logger.info(f"Scheduled digest sent to {count} user(s)")
        except Exception as e:
            logger.error(f"Scheduled digest failed: {e}")

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
    set_public_db(db)
    set_ai_db(db)
    set_social_db(db)
    set_digest_db(db)

    logger.info(f"Connected to MongoDB: {db_name}")

    # Start digest scheduler
    scheduler_task = asyncio.create_task(digest_scheduler())

    yield

    scheduler_task.cancel()
    client.close()
    logger.info("MongoDB connection closed")

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
api_router.include_router(public_router)
api_router.include_router(ai_router)
api_router.include_router(social_router)
api_router.include_router(digest_router)

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
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
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
