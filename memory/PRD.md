# TrackLog - Train Sighting Tracker PRD

## Original Problem Statement
Create a pixel-perfect clone of TrackLog matching its design, layout, colors, fonts, images, animations, and structure. Implement authentication (Google OAuth + manual), protected routes, dashboard with stats, logging sightings (with photos and 'traction type' field), a gallery view of sightings, and a profile management page.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB (test_database)
- **Auth**: Email/Password (bcrypt) + Custom Google OAuth (user's own Client ID/Secret), session cookies (HttpOnly)
- **Email**: Gmail SMTP (smtplib, SSL on port 465) for password reset + daily digest

## What's Been Implemented
- Pixel-perfect landing page
- Email/Password + Custom Google OAuth authentication (user's own Google Cloud project, "Tracklog" branding)
- Forgot Password / Reset via Gmail SMTP magic link
- **Daily Digest**: Automated at 4:00 PM UTC + manual trigger. Styled HTML email recap.
- Protected routes: Dashboard, Log Sighting, My Sightings, Profile, Feed, Bookmarks, Discover
- Dashboard: stats, charts (recharts), AI Insights with conversational reply (GPT), daily digest trigger
- Log Sighting form with photos, traction type
- Edit Sighting with photo management
- Public sharing, My Sightings gallery/list, Profile management
- Community Feed with like/bookmark/follow
- Follow system, Notification bell, Discover page, Enhanced Public Profiles
- Browser tab title: "Tracklog"

## Key API Endpoints
- Auth: POST /register, /login, /forgot-password, /reset-password, /google/callback, GET /me
- Digest: POST /api/digest/send
- Sightings: POST, GET, PUT /{id}, DELETE /{id}, /stats, /analytics
- Social: POST /follow/{id}, GET /following/me, /users/search, /notifications
- AI: POST /analytics-summary, /analytics-reply

## DB Collections
users, user_sessions, sightings, likes, bookmarks, follows, notifications, password_resets

## Backlog
- None remaining
