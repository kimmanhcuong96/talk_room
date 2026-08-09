# English Talk Rooms

Lightweight English speaking practice rooms built with React, Vite, TypeScript, Express, Socket.IO, and WebRTC mesh.

## Features

- 20 predefined rooms, maximum 4 users per room
- No database, authentication, OAuth, or persistence
- WebRTC peer-to-peer audio/video
- Socket.IO signaling and realtime chat
- Mic/camera toggles, active speaker highlight, responsive chat panel
- User-created rooms are removed after remaining empty for 60 seconds; predefined rooms persist

## Local Development

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.
Backend runs on `http://localhost:4000`.

## Environment

Copy `.env.example` if you want to override defaults.

Backend:

- `PORT`: Express and Socket.IO port
- `CLIENT_ORIGIN`: comma-separated allowed frontend origins
- `DATABASE_URL`: Postgres connection string used by the backend for users
- `GOOGLE_CLIENT_ID`: Google OAuth web client ID used to verify ID tokens
- `JWT_SECRET`: long random secret used to sign application JWTs
- `JWT_EXPIRES_IN`: optional JWT lifetime, defaults to `7d`
- `ADMIN_JWT_SECRET`: separate long random secret for admin sessions; falls back to `JWT_SECRET`
- `ADMIN_JWT_EXPIRES_IN`: optional admin JWT lifetime, defaults to `8h`
- `CLOUDFLARE_TURN_KEY_ID`: optional Cloudflare Realtime TURN key ID
- `CLOUDFLARE_TURN_API_TOKEN`: optional Cloudflare API token for generating short-lived TURN credentials
- `CLOUDFLARE_TURN_TTL_SECONDS`: optional TURN credential lifetime, defaults to `86400`
- `CLOUDFLARE_ACCOUNT_ID`: optional Cloudflare account ID used for TURN usage checks
- `CLOUDFLARE_ANALYTICS_API_TOKEN`: optional Cloudflare API token with `Account Analytics: Read`
- `CLOUDFLARE_TURN_USAGE_LIMIT_GB`: optional monthly TURN egress limit before TURN is disabled, defaults to `950`
- `CLOUDFLARE_TURN_USAGE_CHECK_SECONDS`: optional usage check cache duration, defaults to `300`

Frontend:

- `VITE_SOCKET_URL`: Socket.IO server URL
- `VITE_API_URL`: backend HTTP API URL
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth web client ID used by Google Sign-In
- `VITE_SITE_URL`: public frontend URL used to generate production `sitemap.xml` and canonical SEO URLs

## Authentication

The first authentication provider is Google Sign-In. The frontend receives a Google ID token from Google Identity Services and sends it to:

```bash
POST /auth/google
```

The backend verifies the ID token, creates or updates the `users` row, stores only the Google avatar URL, then returns:

```json
{
  "token": "application-jwt",
  "user": {
    "id": "uuid",
    "googleId": "google-sub",
    "email": "user@gmail.com",
    "displayName": "John Smith",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "role": "unverified",
    "createdAt": "2026-08-02T00:00:00.000Z",
    "lastLogin": "2026-08-02T00:00:00.000Z"
  }
}
```

After reload, the frontend verifies the stored application JWT through:

```bash
GET /auth/me
Authorization: Bearer <application-jwt>
```

Run the SQL files in `backend/migrations` in numeric order against the configured Postgres database before enabling login. Migration `002_add_user_role.sql` adds the extensible user roles and defaults existing accounts to `unverified`. Migration `004_create_moderation.sql` adds user reports and system-wide blocks. Migration `005_create_virtual_user_settings.sql` stores the audited virtual-room configuration; apply both newer migrations to Neon before deploying the corresponding backend features.

To promote an account after verification or supporter approval, update its role explicitly:

```sql
UPDATE users SET role = 'verified' WHERE email = 'person@example.com';
UPDATE users SET role = 'supporter' WHERE email = 'supporter@example.com';
```

## Admin area

The admin interface is available at `/admin`. It uses a separate `admin_users` table and a separate admin JWT session from normal app users.

After running `backend/migrations/003_create_admin_users.sql`, bootstrap the first owner once:

```bash
npm run admin:bootstrap -w backend -- --email owner@example.com
```

The owner first signs in from the main site with that exact Google email, then opens `/admin`. The normal Google login response provisions a separate admin session only when the email belongs to an eligible `admin_users` row. Admin and application tokens rotate while the signed-in application session remains valid, including when `/admin` is reopened, focused, or kept open; suspended accounts cannot refresh. Owners can invite and manage other admin accounts from `/admin/admins`; both owners and admins can update app-user roles from `/admin/users` and review reports from `/admin/reports`. Removing an admin performs a soft suspension, and the final active owner cannot be demoted or suspended. Configure a separate `ADMIN_JWT_SECRET` in production; individual admin tokens default to 8 hours but are renewed through the active application session.

## Deployment

- Frontend: deploy `frontend/` to GitHub Pages with the included GitHub Actions workflow.
- Backend: deploy `backend/` to Railway, Render, Koyeb, or another Node.js host.
- Configure `VITE_SOCKET_URL` to point to the deployed backend.
- Configure `CLIENT_ORIGIN` on the backend to the deployed frontend URL.

### GitHub Pages

1. In the GitHub repository, open **Settings > Pages**.
2. Set **Build and deployment > Source** to **GitHub Actions**.
3. Open **Settings > Secrets and variables > Actions > Variables**.
4. Add these GitHub Actions variables:
   - `VITE_SOCKET_URL` with the deployed backend URL, for example `https://your-app.onrender.com`.
   - `VITE_API_URL` with the deployed backend URL.
   - `VITE_GOOGLE_CLIENT_ID` with the Google OAuth web client ID.
5. Push to `master` or run **Deploy frontend to GitHub Pages** manually from the **Actions** tab.

The server only manages rooms, chat, presence, and WebRTC signaling. Audio and video are never relayed through the server.
For restrictive networks, configure Cloudflare Realtime TURN on the backend. The frontend loads short-lived ICE servers from `GET /webrtc/ice-config`; if Cloudflare TURN env vars are absent, credential generation fails, or monthly TURN egress reaches `CLOUDFLARE_TURN_USAGE_LIMIT_GB`, it falls back to public STUN servers. TURN usage status is available at `GET /webrtc/turn-usage`.

Selected WebRTC routes are written to the backend logs with the `[WEBRTC_TRANSPORT]` prefix. `TURN` means media is relayed, `STUN` means a server-reflexive P2P route, `DIRECT` means a host-to-host route, and `UNKNOWN` means the browser did not expose enough candidate stats. Reports are deduplicated per peer connection and logged again only when the selected route changes.

```text
[WEBRTC_TRANSPORT] TURN/RELAY | room=room-1 | users=Alice[abc12345]<->Bob[def67890] | candidates=prflx<->relay | protocol=udp | at=2026-08-03T15:26:00.681Z
```
