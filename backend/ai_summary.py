import os
import json
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ai_router = APIRouter(prefix="/ai", tags=["ai"])

db = None

def set_db(database):
    global db
    db = database

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token}, {"_id": 0}
    )
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0}
    )
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return user_doc

@ai_router.post("/analytics-summary")
async def generate_analytics_summary(request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]

    body = await request.json()
    analytics = body.get("analytics", {})
    stats = body.get("stats", {})
    user_name = body.get("user_name", "Trainspotter")

    prompt = build_prompt(analytics, stats, user_name)

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM key not configured")

        chat = LlmChat(
            api_key=api_key,
            session_id=f"analytics-{user_id}-{uuid.uuid4().hex[:8]}",
            system_message="You are a friendly trainspotting analytics assistant. Write concise, insightful summaries about a user's trainspotting activity. Use a warm, encouraging tone. Keep it to 3-4 short paragraphs. Do not use markdown headers. Use plain text with occasional emoji for flair."
        ).with_model("openai", "gpt-4o-mini")

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return {"summary": response}

    except ImportError:
        logger.error("emergentintegrations not installed")
        raise HTTPException(status_code=500, detail="AI service unavailable")
    except Exception as e:
        logger.error(f"AI summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


def build_prompt(analytics, stats, user_name):
    total = stats.get("total_sightings", 0)
    this_month = stats.get("this_month", 0)
    locations = stats.get("unique_locations", 0)

    train_types = analytics.get("by_train_type", [])
    traction_types = analytics.get("by_traction_type", [])
    operators = analytics.get("by_operator", [])
    top_locations = analytics.get("by_location", [])
    streak = analytics.get("streak", {})
    time_of_day = analytics.get("time_of_day", [])
    day_of_week = analytics.get("day_of_week", [])
    platform = analytics.get("platform", {})

    peak_hour = max(time_of_day, key=lambda x: x.get("count", 0), default={}) if time_of_day else {}
    busiest_day = max(day_of_week, key=lambda x: x.get("count", 0), default={}) if day_of_week else {}

    return f"""Analyze this trainspotter's data and write a personalized summary for {user_name}:

STATS:
- Total sightings: {total}
- This month: {this_month}
- Unique locations visited: {locations}
- Current streak: {streak.get('current', 0)} days
- Best streak: {streak.get('longest', 0)} days

FAVORITE TRAIN TYPES: {json.dumps(train_types[:5])}
TRACTION TYPES: {json.dumps(traction_types[:5])}
TOP OPERATORS: {json.dumps(operators[:5])}
TOP LOCATIONS: {json.dumps(top_locations[:5])}
PEAK SPOTTING HOUR: {peak_hour.get('label', 'N/A')} ({peak_hour.get('count', 0)} sightings)
BUSIEST DAY: {busiest_day.get('day', 'N/A')} ({busiest_day.get('count', 0)} sightings)
PLATFORM TOTAL: {platform.get('total_sightings', 0)} sightings from {platform.get('total_users', 0)} spotters

Write a brief, engaging summary highlighting their patterns, achievements, and suggestions."""
