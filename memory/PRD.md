# TrackLog - Train Sighting Tracker PRD

## Original Problem Statement
Create a pixel-perfect clone of TrackLog matching its design, layout, colors, fonts, images, animations, and structure.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts + Leaflet + react-leaflet-cluster (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB (test_database)
- **Auth**: Email/Password (bcrypt) + Custom Google OAuth, session cookies (HttpOnly)
- **Email**: Gmail SMTP for password reset + daily digest (per-user timezone)
- **Maps**: Leaflet + react-leaflet, CartoDB Dark Matter, MarkerCluster, OpenRailwayMap overlay

## What's Been Implemented
- Landing page with 13 features, open source section, YouTube, support/contact, cookie consent
- Auth: Email/Password + Custom Google OAuth + Forgot Password
- Daily Digest: Per-user timezone scheduling (4 PM local)
- Dashboard: stats, charts, AI Insights (GPT), digest trigger, mini map
- Interactive sighting map: markers, clusters, rail lines toggle
- **Train Database**: 34 trains across Australia (18), UK (9), US (7) with specs, livery, route maps, history, status system
- **Admin Panel** (`/admin`): Approve/reject user suggestions, admin-only CRUD for trains
- Admin emails: kodi055free@gmail.com, tracklog-support@train-tracklog.com
- Log/Edit Sighting with photos, Community Feed, Follow/Notifications, Discover, Bookmarks
- Farewell V/K Set banner, Legal pages (Privacy, Terms, Legal, Cookies)
- Browser tab title & favicon: "Tracklog"

## Key API Endpoints
- Auth: POST /register, /login, /forgot-password, /reset-password, /google/callback, GET /me
- Trains: GET /list, /states, /countries, /{train_id}, POST /suggestions, Admin CRUD
- Sightings: POST, GET, PUT, DELETE, /stats, /analytics, /map/data
- Social: POST /follow/{id}, GET /notifications, /users/search

## DB Collections
users, user_sessions, sightings, likes, bookmarks, follows, notifications, password_resets, geocache, digest_log, trains, train_suggestions

## Backlog
- Expand train database to more countries (Japan, Germany, etc.)
- Train images/photos for database entries
