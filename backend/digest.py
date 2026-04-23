import os
import logging
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException, Request
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

digest_router = APIRouter(prefix="/digest", tags=["digest"])

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
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0}
    )
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return user_doc


async def build_digest_data(user_id: str):
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)

    # User's sightings in the last 24h
    my_sightings = await db.sightings.find(
        {"user_id": user_id, "created_at": {"$gte": yesterday}}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # Community sightings (public, not mine) in last 24h
    community_sightings = await db.sightings.find(
        {"is_public": True, "user_id": {"$ne": user_id}, "created_at": {"$gte": yesterday}}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)

    # Likes received in last 24h
    likes_received = await db.likes.count_documents(
        {"created_at": {"$gte": yesterday}}
    )
    my_sighting_ids = [s["sighting_id"] for s in await db.sightings.find(
        {"user_id": user_id}, {"_id": 0, "sighting_id": 1}
    ).to_list(5000)]
    my_likes = await db.likes.count_documents(
        {"sighting_id": {"$in": my_sighting_ids}, "created_at": {"$gte": yesterday}}
    ) if my_sighting_ids else 0

    # New followers in last 24h
    new_followers = await db.follows.count_documents(
        {"following_id": user_id, "created_at": {"$gte": yesterday}}
    )

    # Totals
    total_sightings = await db.sightings.count_documents({"user_id": user_id})
    total_followers = await db.follows.count_documents({"following_id": user_id})

    return {
        "my_sightings": my_sightings,
        "community_sightings": community_sightings,
        "my_likes_24h": my_likes,
        "new_followers_24h": new_followers,
        "total_sightings": total_sightings,
        "total_followers": total_followers,
    }


def build_digest_html(user_name: str, data: dict):
    my = data["my_sightings"]
    community = data["community_sightings"]
    my_count = len(my)
    comm_count = len(community)

    # Build sighting rows
    my_rows = ""
    for s in my[:5]:
        my_rows += f"""<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;color:#fff;font-size:14px;">{s.get('train_number','—')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;color:#f97316;font-size:13px;">{s.get('train_type','')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;color:#9ca3af;font-size:13px;">{s.get('location','')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;color:#9ca3af;font-size:13px;">{s.get('sighting_time','')}</td>
        </tr>"""

    comm_rows = ""
    for s in community[:5]:
        comm_rows += f"""<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;color:#fff;font-size:14px;">{s.get('train_number','—')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;color:#f97316;font-size:13px;">{s.get('train_type','')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;color:#9ca3af;font-size:13px;">{s.get('location','')}</td>
        </tr>"""

    my_section = ""
    if my_count > 0:
        my_section = f"""
        <h3 style="color:#fff;font-size:16px;margin:24px 0 12px;">Your Sightings ({my_count})</h3>
        <table style="width:100%;border-collapse:collapse;background:#1a1a1c;border-radius:8px;overflow:hidden;">
          <tr style="background:#252528;">
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Train</th>
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Type</th>
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Location</th>
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Time</th>
          </tr>
          {my_rows}
        </table>"""
        if my_count > 5:
            my_section += f'<p style="color:#6b7280;font-size:12px;margin-top:8px;">...and {my_count - 5} more</p>'
    else:
        my_section = """
        <div style="background:#1a1a1c;border-radius:8px;padding:24px;text-align:center;margin:16px 0;">
          <p style="color:#6b7280;font-size:14px;">No sightings logged in the last 24 hours.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:4px;">Get out there and spot some trains!</p>
        </div>"""

    comm_section = ""
    if comm_count > 0:
        comm_section = f"""
        <h3 style="color:#fff;font-size:16px;margin:24px 0 12px;">Community Highlights ({comm_count})</h3>
        <table style="width:100%;border-collapse:collapse;background:#1a1a1c;border-radius:8px;overflow:hidden;">
          <tr style="background:#252528;">
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Train</th>
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Type</th>
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Location</th>
          </tr>
          {comm_rows}
        </table>"""

    return f"""\
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0f0f10;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="color:#e34c26;font-weight:bold;font-size:22px;letter-spacing:2px;">TRACKLOG</span>
    <p style="color:#6b7280;font-size:12px;margin-top:4px;">Daily Digest</p>
  </div>

  <h2 style="color:#fff;font-size:20px;margin-bottom:6px;">Hey {user_name}!</h2>
  <p style="color:#9ca3af;font-size:14px;line-height:1.6;">Here's your trainspotting recap for the last 24 hours.</p>

  <!-- Stats Strip -->
  <div style="display:flex;gap:12px;margin:20px 0;">
    <div style="flex:1;background:#1a1a1c;border-radius:8px;padding:16px;text-align:center;">
      <p style="color:#e34c26;font-size:24px;font-weight:bold;margin:0;">{my_count}</p>
      <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:4px 0 0;">Sightings</p>
    </div>
    <div style="flex:1;background:#1a1a1c;border-radius:8px;padding:16px;text-align:center;">
      <p style="color:#ef4444;font-size:24px;font-weight:bold;margin:0;">{data['my_likes_24h']}</p>
      <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:4px 0 0;">Likes</p>
    </div>
    <div style="flex:1;background:#1a1a1c;border-radius:8px;padding:16px;text-align:center;">
      <p style="color:#3b82f6;font-size:24px;font-weight:bold;margin:0;">{data['new_followers_24h']}</p>
      <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:4px 0 0;">New Followers</p>
    </div>
  </div>

  {my_section}
  {comm_section}

  <!-- Totals -->
  <div style="margin-top:24px;padding-top:20px;border-top:1px solid #2a2a2e;">
    <p style="color:#6b7280;font-size:12px;">
      All-time: <span style="color:#fff;">{data['total_sightings']}</span> sightings &middot; <span style="color:#fff;">{data['total_followers']}</span> followers
    </p>
  </div>

  <p style="color:#4b5563;font-size:11px;margin-top:20px;text-align:center;">
    You're receiving this because you requested a daily digest from TrackLog.
  </p>
</div>"""


def send_digest_email(to_email: str, user_name: str, html_body: str):
    smtp_email = os.environ.get("SMTP_EMAIL")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    if not smtp_email or not smtp_password:
        raise HTTPException(status_code=500, detail="Email service not configured")

    today = datetime.now(timezone.utc).strftime("%b %d")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your TrackLog Digest — {today}"
    msg["From"] = f"TrackLog <{smtp_email}>"
    msg["To"] = to_email

    text = f"Hi {user_name}, check your TrackLog daily digest in an HTML-capable email client."
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
    except Exception as e:
        logger.error(f"Failed to send digest email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send digest email")


@digest_router.post("/send")
async def send_daily_digest(request: Request):
    user = await get_current_user(request)
    data = await build_digest_data(user["user_id"])
    html = build_digest_html(user.get("name", "Trainspotter"), data)
    send_digest_email(user["email"], user.get("name", "Trainspotter"), html)

    return {
        "message": "Daily digest sent!",
        "stats": {
            "sightings_24h": len(data["my_sightings"]),
            "likes_24h": data["my_likes_24h"],
            "new_followers_24h": data["new_followers_24h"],
        },
    }
