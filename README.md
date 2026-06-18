# TrackLog

TrackLog is an open-source platform built for train enthusiasts to log, document, organize, and share train sightings.

Created for railfans, photographers, historians, and railway communities, TrackLog provides a modern and community-driven experience focused on preserving and sharing railway activity from around the world.

The platform combines train sighting logs, community features, personal statistics, media sharing, and modern web technologies into a fast, responsive, and accessible experience.

TrackLog is not an official railway operations platform and does not provide real-time operational train tracking.

---

# Features

## Train Sighting Logs

Record and organize train sightings with detailed information including:

- Train numbers
- Locomotive classes
- Operators
- Railway lines
- Locations
- Dates and times
- Notes and observations
- Uploaded photographs

TrackLog makes it easy to build and maintain a personal railway sighting archive.

---

## Community Feed

Explore recent sightings and activity shared by the community.

Users can:
- Share public sightings
- Browse recent railway activity
- Discover rare locomotives
- View community uploads
- Interact with other rail enthusiasts

The community feed helps connect railway enthusiasts through shared observations and documentation.

---

## Profiles & Statistics

Each user has a customizable profile featuring:

- Personal sighting totals
- Activity history
- Uploaded media
- Favorite operators and locomotives
- Public or private profile settings
- Community statistics and insights

TrackLog is designed to make railway logging both useful and enjoyable over time.

---

## AI-Powered Insights

TrackLog includes optional AI-powered features that help summarize and analyze activity across the platform.

Examples may include:
- Sighting summaries
- Activity trends
- Usage insights
- Community highlights

AI-generated information is provided for informational purposes only and may occasionally contain inaccuracies or incomplete results.

---

## Daily Digest Emails

Users can subscribe to automated digest emails containing:
- Community highlights
- Personal activity summaries
- Recent sightings
- Platform updates

Notification preferences can be customized within account settings.

---

## Mobile-Friendly Design

TrackLog is fully responsive and optimized for:
- Mobile devices
- Tablets
- Desktop browsers

The platform is designed to remain fast, readable, and accessible across modern devices.

---

## Open Source

TrackLog is fully open source.

Anyone is welcome to:
- Explore the codebase
- Fork the project
- Submit pull requests
- Report bugs
- Suggest features
- Contribute improvements

The project is community-focused and built with transparency in mind.

---

# Philosophy

TrackLog was created to provide a clean, modern, and community-focused platform for railway enthusiasts.

The project aims to:
- Encourage railway documentation and preservation
- Support enthusiast communities
- Provide modern tools for sighting logs
- Remain transparent and open source
- Avoid unnecessary complexity

No corporate buzzword overload.
No “AI-powered transportation ecosystem disruption.”
Just a platform built by someone who genuinely enjoys trains, software, and open communities.

Which is surprisingly rare online now.

---

# Tech Stack

TrackLog is built using modern web technologies.

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

- Node.js
- PostgreSQL
- Authentication and session management
- API integrations

## Analytics & Monitoring

- PostHog Analytics
- Error logging
- Performance monitoring

## Deployment

TrackLog can be deployed using:
- Vercel
- Railway
- Docker
- Self-hosted infrastructure

---

# Getting Started

## Clone the Repository

bash id="g6zq91" git clone https://github.com/KodiFree2505/TracklogV3.git cd TracklogV3 

---

## Install Dependencies

Using npm:

bash id="n4v8tb" npm install 

Or using pnpm:

bash id="x0r2mh" pnpm install 

---

## Configure Environment Variables

Create a .env.local file in the project root.

Example:

env id="m9c7jw" DATABASE_URL= NEXTAUTH_SECRET= NEXTAUTH_URL= POSTHOG_KEY= POSTHOG_HOST= EMAIL_SERVER= EMAIL_FROM= 

Additional environment variables may be required depending on deployment configuration and integrations.

---

## Database Setup

Run database migrations:

bash id="j2r8po" npm run migrate 

(Optional) Seed development data:

bash id="f1k3sz" npm run seed 

---

## Run the Development Server

bash id="t8y1la" npm run dev 

The application will be available at:

text id="r4m6qe" http://localhost:3000 

---

# Project Structure

text id="w2x8fj" /app            → Application routes and pages /components     → Reusable UI components /lib            → Shared utilities and helpers /styles         → Global styles /public         → Static assets /database       → Database schema and migrations /emails         → Email templates 

---

# Contributing

Contributions are welcome and encouraged.

## Ways to Contribute

- Report bugs
- Improve accessibility
- Optimize performance
- Add features
- Improve documentation
- Suggest UI improvements
- Submit pull requests

---

## Contribution Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Commit your updates clearly
5. Open a pull request

Please keep pull requests focused and well documented.

---

# Community Guidelines

Users and contributors are expected to behave respectfully.

Do not:
- Harass other users
- Upload illegal or harmful content
- Spam or abuse the platform
- Attempt unauthorized access
- Violate intellectual property rights

TrackLog reserves the right to remove content or suspend accounts that violate community standards.

---

# Privacy

TrackLog respects user privacy.

The platform may collect:
- Account information
- Uploaded content
- Usage analytics
- Authentication and session data

Analytics are used to improve the platform experience, monitor performance, and identify issues.

For more information, please see the Privacy Policy:

https://train-tracklog.com/privacy-policy

---

# Disclaimer

TrackLog is a community-based enthusiast platform.

Information available through the platform may be:
- User-generated
- Historical
- Estimated
- Incomplete

TrackLog is not affiliated with railway operators and does not provide official operational or real-time train tracking data.

The platform should not be relied upon for operational, emergency, or safety-critical decisions.

---

# Roadmap

Planned and experimental features may include:
- Advanced statistics
- Route history visualization
- Achievement systems
- Enhanced media galleries
- Public APIs
- Offline support
- Multi-language support
- Improved moderation tools

Roadmap items may change over time as the platform evolves.

---

# License

This project is licensed under the MIT License unless otherwise stated.

See the LICENSE file for additional details.

---

# Links

## Website
https://train-tracklog.com

## GitHub
https://github.com/KodiFree2505/TracklogV3

## YouTube
https://youtube.com/@Kodifree2505

## Support
support@Train-Tracklog.com

---

# Acknowledgements

Special thanks to:
- The railway enthusiast community
- Open-source contributors
- Developers maintaining modern web tooling
- Everyone helping preserve railway history and documentation

---

Built for railway enthusiasts, photographers, historians, and rail communities around the world.
