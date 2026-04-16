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
- Protected routes (Dashboard, Log Sighting, My Sightings, Profile, Feed, Bookmarks)
- Comprehensive Dashboard with:
  - Stats cards, area charts, donut charts, bar charts, hourly/weekly patterns, streaks, platform stats
  - **AI Insights with conversational reply** (GPT via emergentintegrations) — generates summary, then user can ask follow-up questions in a mini-chat
- Log Sighting form with train details, traction type, location/time, photos, notes
- Public sharing: toggle sightings/profile public, copy shareable links
- My Sightings gallery/list view with search, delete, share controls, detail modal
- Profile management (name, picture, password change, profile visibility, delete account)
- Public pages: /share/sighting/:shareId, /share/user/:userId
- **Community Feed** (/feed): Authenticated-only, shows all public sightings with search, pagination
- **Like & Bookmark system**: Toggle likes/bookmarks on feed cards, like counts, dedicated Bookmarks page
- **Bookmarks page** (/bookmarks): View and manage saved sightings

## Key API Endpoints
- POST /api/auth/register, /api/auth/login, GET /api/auth/me
- POST /api/sightings, GET /api/sightings, GET /api/sightings/stats, GET /api/sightings/analytics
- POST /api/sightings/{id}/like, POST /api/sightings/{id}/bookmark
- GET /api/sightings/interactions/me, GET /api/sightings/bookmarks/me
- GET /api/public/feed, GET /api/public/sightings/{share_id}, GET /api/public/users/{user_id}
- POST /api/ai/analytics-summary, POST /api/ai/analytics-reply

## DB Collections
- users, user_sessions, sightings, likes, bookmarks

## Key Fixes Applied
- AI Summary 401: Fixed auth querying wrong collection
- "Body is disturbed or locked": safeFetch XHR wrapper
- Relative URLs for cross-domain compatibility
- Google OAuth race condition fix
- Route ordering: static paths before /{sighting_id} catch-all

## Backlog
- End-to-end multi-user testing for public profile/sighting sharing (P1)
