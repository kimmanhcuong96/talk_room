# me2talk

Me2talk (Me to talk) is a realtime language-practice application built around small **Talking Room** sessions. Users can practice languages, chat, connect by audio/video, and use room topics or shared YouTube content.

## Features

- 18 predefined Talking Rooms, up to 4 participants per room.
- Custom rooms for verified users; supporters can also enable camera access.
- Primary and optional secondary language tags, native-language labels, and CEFR-style level selection.
- Search and language-tag filtering on the home page, including room counts.
- Google Sign-In with `unverified`, `verified`, and `supporter` user roles.
- One active room per user. Joining a new room automatically leaves the previous room.
- Guest identity and nickname persistence through local storage.
- Realtime chat, WebRTC mesh audio/video, active-speaker layout, and responsive UI.
- Room topics with configurable text, color, font, and optional icon.
- Room-owner YouTube sharing and playback controls.
- Room-level block/report moderation and administrator review.
- 15 configurable Virtual User profiles, including editable avatar URLs, rule-based chat fallback, and optional LLM chat.
- Admin dashboard for user roles, admin accounts, moderation reports, Virtual Users, LLM usage, cumulative room time, and STUN/TURN analytics.
- Empty custom rooms are deleted after 60 seconds; empty rooms reset temporary topic, YouTube, language, and message state.

## Requirements

- Node.js 20 or newer and npm.
- PostgreSQL (Neon is recommended for production).
- Google OAuth Web Client ID for sign-in.
- Optional: Cloudflare Realtime TURN credentials for restrictive networks.
- Optional: Cloudflare Workers AI account and API token for Virtual User LLM chat.
- Optional: YouTube Data API v3 key for recommendation cards in Manage YouTube.

## Installation and local setup

From the repository root:

```bash
npm install
```

Create a backend environment file at `backend/.env`:

```dotenv
PORT=4000
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_JWT_SECRET=replace-with-another-long-random-secret
```

Create `frontend/.env`:

```dotenv
VITE_SOCKET_URL=http://localhost:4000
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
VITE_SITE_URL=http://localhost:5173
```

Run every SQL file in `backend/migrations` against Neon in numeric order. `005_create_virtual_users.sql` contains the complete Virtual User schema and seed data, including response tracking, proactive-message probability, and configurable long-response delays. Do this before starting the backend with a production database.

To enable Cloudflare Workers AI chat locally, copy `.env.example` to `.env`, fill in `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_API_TOKEN`, then set `LLM_PROVIDER=cloudflare` and `LLM_MODEL=@cf/meta/llama-3.1-8b-instruct-fast`. Apply `005_create_virtual_users.sql` before starting the backend. The key must stay in the backend `.env`; do not add it to `frontend/.env.local` or commit it.

Start both workspaces:

```bash
npm run dev
```

The frontend is available at `http://localhost:5173` and the backend at `http://localhost:4000`. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`:

```powershell
npm.cmd run dev
```

Useful checks:

```bash
npm run typecheck
npm run build
npm test
```

## Environment variables

Backend variables:

- `PORT`: HTTP and Socket.IO port (default `4000`).
- `CLIENT_ORIGIN`: comma-separated frontend origins allowed by Express and Socket.IO.
- `DATABASE_URL`: Neon/PostgreSQL connection string.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID used to verify ID tokens.
- `JWT_SECRET`, `JWT_EXPIRES_IN`: application JWT signing secret and optional lifetime (default `7d`).
- `ADMIN_JWT_SECRET`, `ADMIN_JWT_EXPIRES_IN`: admin JWT secret and optional lifetime (default `8h`). Admin sessions are renewed while the application session remains valid.
- `YOUTUBE_DATA_API_KEY`: optional server-side YouTube Data API v3 key. Only the backend uses it.
- `LLM_PROVIDER`: optional Virtual User LLM provider. Use `cloudflare` for Cloudflare Workers AI or `ollama` for local development. If absent, Virtual Users keep using rule-based behavior only, except legacy `OLLAMA_MODEL` setups.
- `LLM_MODEL`: model id for the selected provider. For Cloudflare Workers AI, use a lightweight chat model such as `@cf/meta/llama-3.1-8b-instruct-fast` or another current model from the Cloudflare catalog.
- `LLM_MAX_TOKENS`: optional non-negative integer application-level lifetime token cap. If absent, no application-level token limit is enforced. When reached, the backend stops making LLM calls and falls back to rule-based responses. Invalid values stop backend startup instead of silently disabling the cap.
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_API_TOKEN`: server-side credentials for Cloudflare Workers AI REST inference. Never expose these to the frontend.
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`: optional legacy local LLM provider for Virtual User responses; prefer `LLM_PROVIDER=ollama` and `LLM_MODEL=...` for new configuration.
- `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN`, `CLOUDFLARE_TURN_TTL_SECONDS`: optional short-lived Cloudflare TURN credentials.
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_API_TOKEN`: optional Cloudflare Analytics access for TURN egress checks. The analytics dashboard's STUN/TURN duration is recorded by this backend independently.
- `CLOUDFLARE_TURN_USAGE_LIMIT_GB`, `CLOUDFLARE_TURN_USAGE_CHECK_SECONDS`: optional TURN egress guard settings (defaults `950` GB and `300` seconds).

Frontend variables:

- `VITE_SOCKET_URL`: backend Socket.IO URL.
- `VITE_API_URL`: backend HTTP API URL.
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID.
- `VITE_SITE_URL`: public canonical URL used by generated SEO files.

## Authentication, roles, and admin setup

Google Sign-In creates or updates a row in `users`. User roles are:

- `unverified`: can join rooms but cannot create custom rooms.
- `verified`: can create custom rooms.
- `supporter`: can create custom rooms and use camera features.

Bootstrap the first owner after migrations `001` through `003` have been applied:

```bash
npm run admin:bootstrap -w backend -- --email owner@example.com
```

The owner must then sign in with the same Google email and open `/admin`. Owners can invite or suspend admins at `/admin/admins`; admins and owners can manage users, reports, Virtual Users, and analytics. Only owners can manage admin accounts.

## Admin analytics

Open `/admin/llm-usage` to view Virtual User LLM usage:

- requests and input/output/total tokens for today, this week, this month, and this year;
- breakdown by provider, model, and Virtual User;
- usage data recorded from provider token metadata when available, with conservative estimates when it is not available.

LLM usage and the global token counter are committed atomically in PostgreSQL. With a token cap configured, quota checks are serialized across rooms and backend instances. If usage tracking cannot be verified safely, chat continues with the existing rule-based fallback and no new LLM request is made.

When `LLM_PROVIDER` is set, its model and credentials are validated at backend startup. Unsupported providers or incomplete configuration fail startup clearly; leaving `LLM_PROVIDER` unset keeps the rule-based system available without making LLM requests.

Cloudflare Workers AI is the initial hosted provider, but the Virtual User business logic talks to a provider abstraction. Future providers can be added by implementing the backend `LLMProvider` interface and selecting them with `LLM_PROVIDER`; do not add automatic paid-provider fallback.

Each Virtual User profile has separate reply and proactive-message probabilities, plus configurable long-response delay bounds. After the bot was the last sender and the room has been quiet for three minutes, the backend evaluates the proactive probability every 30 seconds. It can send at most one proactive message until the human replies. Responses of 30 or more characters target a total response window of 5–15 seconds by default; admins can tune the minimum and maximum per bot.

When at most five rooms contain human participants, the backend keeps five randomly selected available Virtual Users waiting across five random empty system rooms. Waiting bots do not consume human room capacity. Bot assignment to a room with a human is also randomized; when more than five rooms contain humans, bots that are only waiting in empty rooms are released back to the pool.

Open `/admin/analytics` to view:

- cumulative room time for every authenticated user;
- STUN and TURN duration for today, the last seven days, the current month, and the current year;
- daily STUN/TURN history for the latest period retained by the backend.

Room time is finalized when a user leaves or disconnects. STUN/TURN time is finalized when the selected WebRTC route changes or the peer connection ends. Anonymous guests are not included in per-user database totals because they do not have a durable account ID.

## Deployment

Recommended production layout:

1. Run the backend on Render (or another Node.js host) with Neon `DATABASE_URL`.
2. Deploy `frontend/` to Cloudflare Pages or GitHub Pages.
3. Set frontend `VITE_API_URL` and `VITE_SOCKET_URL` to the deployed backend URL.
4. Set backend `CLIENT_ORIGIN` to the exact deployed frontend origin(s).
5. Configure Google OAuth authorized origins/redirect settings for the production domain.
6. Apply all migrations, including `005_create_virtual_users.sql`, before enabling sign-in and analytics.

For Cloudflare Pages, build the frontend workspace with `npm run build -w frontend` and publish `frontend/dist`. For Render, build the backend with `npm run build -w backend` and start it with `npm run start -w backend`.

## HTTP and realtime endpoints

- `GET /health`
- `GET /rooms`
- `POST /auth/google`, `GET /auth/me`
- `GET /webrtc/ice-config`, `GET /webrtc/turn-usage`
- Admin-protected: `/admin/users`, `/admin/admins`, `/admin/reports`, `/admin/virtual-users`, `/admin/webrtc-usage`, `/admin/llm-usage`

Audio/video media is peer-to-peer whenever possible. The server handles presence, chat, authorization, signaling, usage accounting, and moderation; it does not persist media or chat history.
