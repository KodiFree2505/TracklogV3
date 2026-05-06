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
# Daily Digest Scheduler (per-user timezone, sends at 4:00 PM local)
# --------------------------------------------------
DIGEST_TARGET_HOUR = 16  # 4:00 PM in user's local timezone

async def digest_scheduler():
    """Background loop that checks every 15 minutes and sends digests to users whose local time is 4:00 PM."""
    from datetime import datetime, timezone, timedelta
    logger.info("Digest scheduler started — will send at 16:00 in each user's local timezone")
    while True:
        await asyncio.sleep(900)  # Check every 15 minutes
        try:
            now_utc = datetime.now(timezone.utc)
            current_utc_hour = now_utc.hour
            current_utc_minute = now_utc.minute

            # Only process at :00 and :15 and :30 and :45 marks (within 15 min window)
            # Find which UTC offsets would make it 16:00 local right now
            # offset = local - UTC, so local_hour = utc_hour + offset => offset = 16 - utc_hour
            target_offset = DIGEST_TARGET_HOUR - current_utc_hour
            # Normalize to valid range
            if target_offset > 14:
                target_offset -= 24
            if target_offset < -12:
                target_offset += 24

            # Find users whose timezone offset matches (within 15 min window)
            # We store timezone as IANA string, so we need to check which offsets are currently at 16:00
            users = await db.users.find(
                {"timezone": {"$exists": True, "$ne": None}},
                {"_id": 0, "password_hash": 0}
            ).to_list(10000)

            # Also check if we already sent today to avoid duplicates
            today_str = now_utc.strftime("%Y-%m-%d")

            sent = 0
            for user in users:
                tz_str = user.get("timezone")
                if not tz_str or not user.get("email"):
                    continue

                try:
                    from zoneinfo import ZoneInfo
                    user_tz = ZoneInfo(tz_str)
                    user_now = now_utc.astimezone(user_tz)

                    # Check if it's between 16:00 and 16:14 in user's local time
                    if user_now.hour == DIGEST_TARGET_HOUR and user_now.minute < 15:
                        # Check if already sent today
                        already_sent = await db.digest_log.find_one({
                            "user_id": user["user_id"],
                            "date": today_str
                        })
                        if already_sent:
                            continue

                        data = await build_digest_data(user["user_id"])
                        html = build_digest_html(user.get("name", "Trainspotter"), data)
                        send_digest_email(user["email"], user.get("name", "Trainspotter"), html)
                        await db.digest_log.insert_one({
                            "user_id": user["user_id"],
                            "date": today_str,
                            "sent_at": now_utc
                        })
                        sent += 1
                except Exception as e:
                    logger.error(f"Digest error for {user.get('email')}: {e}")

            if sent > 0:
                logger.info(f"Sent {sent} timezone-based digest(s)")
        except Exception as e:
            logger.error(f"Digest scheduler error: {e}")

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
