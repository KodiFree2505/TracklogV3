# TrackLog - Train Sighting Tracker PRD

## Original Problem Statement
Create a pixel-perfect clone of https://trainspot-hub.emergent.host/ matching its design, layout, colors, fonts, images, animations, and structure. Implement authentication (Google OAuth + manual), protected routes, dashboard with stats, logging sightings (with photos and 'traction type' field), a gallery view of sightings, and a profile management page.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB (test_database)
- **Auth**: Email/Password (bcrypt) + Emergent-managed Google OAuth, session cookies (HttpOnly)

## What's Been Implemented
- Pixel-perfect landing page (LandingPage.jsx, HeroSection.jsx, FeaturesSection.jsx)
- Email/Password + Google OAuth authentication
- Protected routes (Dashboard, Log Sighting, My Sightings, Profile)
- Dashboard with stats cards and top lists
- Log Sighting form with train details, traction type, location/time, photos (base64), notes
- My Sightings gallery/list view with search, delete, detail modal
- Profile management (name, picture, password change, delete account)

## Key Fixes Applied (April 2026)
- **LogSighting.jsx truncation**: Fully rebuilt the component (was cut off at line 103)
- **Google OAuth race condition**: Fixed AuthCallback to properly extract session_id and call exchangeSession()
- **AuthProvider race condition**: Skip checkAuth() when session_id is in URL hash
- **Cookie settings**: Updated to Secure + SameSite=none for HTTPS preview domain
- **ProfilePage auth_provider**: Fixed detection of Google vs email accounts

## Backlog
- None (all initial requirements implemented)
