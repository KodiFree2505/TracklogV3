# TrackLog - Train Sighting Tracker PRD

## Original Problem Statement
Create a pixel-perfect clone of TrackLog matching its design, layout, colors, fonts, images, animations, and structure. Implement authentication (Google OAuth + manual), protected routes, dashboard with stats, logging sightings (with photos and 'traction type' field), a gallery view of sightings, and a profile management page.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB (test_database)
- **Auth**: Email/Password (bcrypt) + Emergent-managed Google OAuth, session cookies (HttpOnly)

## What's Been Implemented
- Pixel-perfect landing page
- Email/Password + Google OAuth authentication
- Protected routes: Dashboard, Log Sighting, My Sightings, Profile, Feed, Bookmarks, Discover
- Dashboard: stats, charts (recharts), AI Insights with conversational reply (GPT)
- Log Sighting form with photos, traction type
- **Edit Sighting**: inline edit dialog from My Sightings (train number, type, traction, operator, route, location, date, time, notes) + edit button in detail modal
- Public sharing: toggle sightings/profile public, shareable links
- My Sightings gallery/list with search, delete, share, edit controls
- Profile management (name, picture, password, visibility, delete)
- Community Feed (/feed): public sightings with like/bookmark/follow
- Like & Bookmark system with Bookmarks page
- Follow system with follower/following counts
- Notification system: in-app bell (mobile + desktop), notifications for likes, bookmarks, follows
- Discover page (/discover): search public users, user cards with stats
- Enhanced Public Profile with follower/following/sighting counts, follow button

## Key API Endpoints
- Auth: POST /api/auth/register, /login, GET /me, PUT /profile, /password, /profile/visibility
- Sightings: POST /api/sightings, GET, PUT /{id}, DELETE /{id}, /stats, /analytics, /interactions/me, /bookmarks/me
- Like/Bookmark: POST /api/sightings/{id}/like, /bookmark
- Public: GET /api/public/feed, /sightings/{share_id}, /users/{user_id}
- Social: POST /api/social/follow/{id}, GET /following/me, /users/search, /notifications, /notifications/unread-count, PUT /notifications/read
- AI: POST /api/ai/analytics-summary, /analytics-reply

## DB Collections
users, user_sessions, sightings, likes, bookmarks, follows, notifications

## Backlog
- None remaining
