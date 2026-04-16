# TrackLog - Train Sighting Tracker PRD

## Original Problem Statement
Create a pixel-perfect clone of https://trainspot-hub.emergent.host/ matching its design, layout, colors, fonts, images, animations, and structure. Implement authentication (Google OAuth + manual), protected routes, dashboard with stats, logging sightings (with photos and 'traction type' field), a gallery view of sightings, and a profile management page.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB (test_database)
- **Auth**: Email/Password (bcrypt) + Emergent-managed Google OAuth, session cookies (HttpOnly)

## What's Been Implemented
- Pixel-perfect landing page (LandingPage.jsx, HeroSection.jsx, FeaturesSection.jsx)
- Email/Password + Google OAuth authentication
- Protected routes (Dashboard, Log Sighting, My Sightings, Profile, Feed)
- Comprehensive Dashboard with:
  - Stats cards (total, this month, locations, last sighting)
  - Sightings over time (area chart, last 30 days)
  - Train type and traction type donut charts
  - Top operators and locations horizontal bar charts
  - Time-of-day hourly distribution chart
  - Day-of-week activity chart
  - Streak tracking (current + best)
  - Platform-wide stats (total sightings, total users)
  - AI-powered analytics summary (GPT via emergentintegrations)
- Log Sighting form with train details, traction type, location/time, photos (FormData + JSON), notes
- Public sharing: toggle sightings/profile public, copy shareable links
- My Sightings gallery/list view with search, delete, share controls, detail modal
- Profile management (name, picture, password change, profile visibility, delete account)
- Public pages: /share/sighting/:shareId, /share/user/:userId
- **Community Feed** (/feed): Authenticated-only page showing all public sightings with search, pagination, and nav

## Key Fixes Applied
- **AI Summary 401 bug**: Fixed auth in ai_summary.py — was querying `users` collection instead of `user_sessions`
- **"Body is disturbed or locked"**: Created safeFetch (XHR-based) to bypass emergent-main.js fetch monkey-patching
- **Relative URLs**: All API calls use relative paths (/api/...) for cross-domain compatibility
- **CORS**: Dynamic from CORS_ORIGINS env var
- **Google OAuth race condition**: AuthProvider skips checkAuth when session_id in hash
- **Cookie settings**: Secure + SameSite=lax

## Backlog
- End-to-end multi-user testing for public profile and public sighting sharing (P1)
