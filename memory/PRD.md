# TrackLog - Train Sighting Tracker PRD

## Original Problem Statement
Create a pixel-perfect clone of TrackLog matching its design, layout, colors, fonts, images, animations, and structure. Implement authentication (Google OAuth + manual), protected routes, dashboard with stats, logging sightings (with photos and 'traction type' field), a gallery view of sightings, and a profile management page.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts + Leaflet + react-leaflet-cluster (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB (test_database)
- **Auth**: Email/Password (bcrypt) + Custom Google OAuth (user's own Client ID/Secret), session cookies (HttpOnly)
- **Email**: Gmail SMTP (smtplib, SSL on port 465) for password reset + daily digest
- **Maps**: Leaflet + react-leaflet with CartoDB Dark Matter tiles, MarkerClusterGroup, OpenRailwayMap overlay, OpenStreetMap Nominatim geocoding

## What's Been Implemented
- Pixel-perfect landing page with 13-feature showcase (real app screenshots), open source section, YouTube channel, support/contact, cookie consent
- Email/Password + Custom Google OAuth authentication (user's own Google Cloud project, "Tracklog" branding)
- Forgot Password / Reset via Gmail SMTP magic link
- **Daily Digest**: Per-user timezone scheduling (4 PM local), auto-detect browser timezone + manual override in profile
- Protected routes: Dashboard, Log Sighting, My Sightings, Profile, Feed, Bookmarks, Discover, Map, Train Database, Community
- Dashboard: stats, charts (recharts), AI Insights with conversational reply (GPT), daily digest trigger, mini map
- Interactive sighting map: full-page dark-themed map with color-coded markers, numbered clusters, rail lines toggle, auto-fit bounds
- **Train Database**: Comprehensive Australian rolling stock database with specs, livery history, route maps with station markers, history timelines, status system (In Service/Withdrawn/Preserved/Under Refurbishment/Testing), search/filter by state/status
- Log Sighting form with photos, traction type
- Edit Sighting with photo management
- Public sharing, My Sightings gallery/list, Profile management with timezone
- Community Feed with like/bookmark/follow
- Follow system, Notification bell, Discover page, Enhanced Public Profiles
- Farewell V/K Set banner (dismissible)
- Legal pages: Privacy Policy, Terms of Service, Legal Imprint, Cookie Notice
- Browser tab title & favicon: "Tracklog"

## Key API Endpoints
- Auth: POST /register, /login, /forgot-password, /reset-password, /google/callback, PUT /profile/timezone, GET /me
- Digest: POST /api/digest/send
- Sightings: POST, GET, PUT /{id}, DELETE /{id}, /stats, /analytics, /map/data
- Social: POST /follow/{id}, GET /following/me, /users/search, /notifications
- AI: POST /analytics-summary, /analytics-reply
- Trains: GET /list, /states, /countries, /{train_id}, POST /suggestions

## DB Collections
users, user_sessions, sightings, likes, bookmarks, follows, notifications, password_resets, geocache, digest_log, trains, train_suggestions

## Backlog
- Expand train database to more countries
- User suggestion approval admin interface
