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
- Public sharing: toggle sightings/profile public, shareable links
- My Sightings gallery/list with search, delete, share, detail modal
- Profile management (name, picture, password, visibility, delete)
- **Community Feed** (/feed): public sightings with like/bookmark/follow
- **Like & Bookmark system**: toggle likes/bookmarks, like counts, Bookmarks page
- **Follow system**: follow/unfollow users, follower/following counts
- **Notification system**: in-app bell (works on mobile + desktop), notifications for likes, bookmarks, follows
- **Discover page** (/discover): search public users, user cards with stats, follow buttons
- **Enhanced Public Profile** (/share/user/:id): follower/following/sighting counts, member_since, follow button

## Key API Endpoints
- Auth: POST /api/auth/register, /login, GET /me, PUT /profile, /password, /profile/visibility
- Sightings: POST /api/sightings, GET /api/sightings, /stats, /analytics, /interactions/me, /bookmarks/me
- Like/Bookmark: POST /api/sightings/{id}/like, /bookmark
- Public: GET /api/public/feed, /sightings/{share_id}, /users/{user_id}
- Social: POST /api/social/follow/{id}, GET /following/me, /users/search, /notifications, /notifications/unread-count, PUT /notifications/read
- AI: POST /api/ai/analytics-summary, /analytics-reply

## DB Collections
users, user_sessions, sightings, likes, bookmarks, follows, notifications

## Backlog
- None remaining from original requirements
