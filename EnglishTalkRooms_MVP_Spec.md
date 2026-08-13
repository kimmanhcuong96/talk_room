# me2talk MVP Specification

## Goal

Build a lightweight web application for people to practice languages, talk, and connect in small public Talking Rooms.

## Principles

- Use a lightweight database only for authenticated user profiles.
- Use Google OAuth only for the first authentication version.
- Keep realtime room state in server RAM; persist only authenticated account metadata and usage aggregates.
- Maximum 4 users per room.
- Exactly 12 predefined rooms.
- Lowest possible server cost.
- WebRTC mesh peer-to-peer for audio/video media.
- The server must never relay audio or video.
- The frontend must never create or update users directly.

## Tech Stack

### Frontend

- React.
- Vite.
- TypeScript.
- Tailwind CSS.
- Socket.IO client.
- Lucide icons.

### Backend

- Node.js.
- Express.
- Socket.IO.
- TypeScript.
- PostgreSQL client.
- Google ID token verification.
- Application JWT issuance.

### Database

- Neon Postgres.
- Backend-only database access.
- No media or image binary storage.
- No chat history persistence; chat remains in room memory and is cleared when the room resets.

### Realtime

- Socket.IO for room presence, chat, and WebRTC signaling.
- WebRTC mesh P2P for media.
- Google public STUN server.
- TURN is optional for production hardening.

## Architecture

Server responsibilities:

- Room management.
- User join/leave.
- Room user count.
- In-memory chat history per room.
- WebRTC signaling: offer, answer, ICE candidate.
- User media status: mic, camera, screen sharing, and active screen track metadata.
- Google OAuth ID token verification.
- User profile creation and updates.
- Application JWT issuance.
- Authenticated user profile lookup.
- Cumulative authenticated-user room-time accounting.
- STUN/TURN route accounting and daily usage aggregation.
- Admin APIs for user management, Virtual Users, moderation, room-time, and WebRTC analytics.

Client responsibilities:

- UI rendering.
- Google Sign-In initiation.
- Sending Google ID tokens to the backend.
- Application JWT persistence in `localStorage`.
- Rendering backend-verified user profile information.
- Local nickname persistence in `localStorage`.
- Local language preference persistence in `localStorage`.
- Client-side i18n rendering.
- Local media capture and device availability checks.
- Screen sharing capture when supported by the browser.
- WebRTC peer connection management.
- Client-side active speaker detection.
- Responsive video/chat layout.

## Rooms

Exactly 12 predefined rooms.

Each room:

- Has a deterministic id: `room-1` through `room-12`.
- Has a stable URL: `/room/:roomId`.
- Max 4 users.
- Hardcoded.
- Verified users can create custom rooms; supporters can create custom rooms and use camera features. Custom rooms are removed after 60 seconds with no connected users.

Room names:

- English Beginner
- English Intermediate
- Daily Conversation
- IELTS Speaking
- Business English
- Travel English
- Pronunciation Practice
- Free Talk
- Movie Discussion
- Book Club
- Technology
- Gaming
- Culture Exchange
- Debate
- Vocabulary Practice
- Grammar Practice
- Interview English
- Coffee Chat
- Weekend Talk
- Random Talk

## Home Page

Display:

- App title and server connection state.
- User information and Google Sign-In state.
- Action bar:
  - Create a new group
  - Buy me a coffee
  - Free4Talk APP
  - Privacy Policy
  - Contact Us
  - About Us
- Search bar with placeholder `Search by Topic & User`.
- Room density selector: `3x`, `2x`, `1x`.
- Room cards:
  - Room name.
  - Current users `(x/4)`.
  - Join button.

Behavior:

- Rooms are shown from a frontend fallback list immediately.
- Socket room counts update the fallback room list when server data arrives.
- Join is disabled when the room is full.
- Search filters rooms by topic/name.
- Density selector changes room grid density.
- Language can be changed only on Home.
- Language selection is persisted and reused after reload.
- User information is shown on Home when authenticated.
- Google avatar is rendered directly from the backend-verified `avatarUrl`.
- Language tags are displayed on each card and can be used as a filter; counts include all matching rooms.
- The density selector means one, two, or three room cards per row.
- Participant avatars are shown on room cards with basic profile information on hover.

## Authentication

The first version supports Google Sign-In only.

Flow:

``` text
User
  -> Google OAuth Login
  -> Google returns ID Token
  -> Backend verifies ID Token
  -> Backend extracts user information
  -> Backend finds user by Google ID
  -> Existing user: update profile and last_login
  -> New user: create users row
  -> Backend generates application JWT
  -> Backend returns JWT and user profile
```

Google profile fields extracted from the verified ID token:

- Google user ID: `sub`
- Email: `email`
- Display name: `name`
- Avatar URL: `picture`

Backend endpoints:

- `POST /auth/google`
  - Request body: `{ "idToken": "google-id-token" }`
  - Verifies the Google ID token.
  - Creates or updates the user row.
  - Returns `{ token, user }`.
- `GET /auth/me`
  - Requires `Authorization: Bearer <application-jwt>`.
  - Returns the backend-verified user profile for the stored JWT.

Frontend behavior:

- The frontend loads Google Identity Services.
- The frontend sends only the Google ID token to the backend.
- The frontend stores the application JWT in `localStorage`.
- On reload, the frontend calls `GET /auth/me` before rendering user information.
- The frontend does not create, update, or trust user profile data directly.

Future OAuth providers should be isolated behind provider-specific verification modules so Facebook, GitHub, or Apple can be added without changing the user persistence flow.

## Database

Use Neon Postgres as the managed database provider.

The backend connects through `DATABASE_URL`.

Create a `users` table:

| Column       | Type      | Description           |
| ------------ | --------- | --------------------- |
| id           | UUID      | Primary Key           |
| google_id    | VARCHAR   | Unique Google User ID |
| email        | VARCHAR   | User email            |
| display_name | VARCHAR   | Display name          |
| avatar_url   | TEXT      | Google avatar URL     |
| created_at   | TIMESTAMPTZ | Account creation time |
| last_login   | TIMESTAMPTZ | Last successful login |

Constraints:

- `google_id` must be unique.
- `email` must be unique.
- Index both `google_id` and `email`.

Database usage rules:

- Only the backend communicates with Neon.
- Store only profile metadata and the Google avatar URL.
- Do not upload or store avatar images.
- Do not store image binaries.
- Do not persist room state, WebRTC signaling, or chat history.
- Store cumulative authenticated-user room duration in `user_room_time_totals` and finalized sessions in `user_room_time_sessions`.
- Store daily STUN/TURN duration in `webrtc_usage_daily`; aggregate it into day, week, month, and year views in the admin API.
- Virtual User profiles are persisted in `virtual_user_profiles`, including `avatar_url`, and can be edited only through admin authorization.

### Usage tracking

When an authenticated user joins a room, the backend starts an in-memory session keyed by socket ID and user ID. On an explicit leave, room replacement, or disconnect, it writes the elapsed duration and atomically increments the user's cumulative total. Guest sessions are intentionally excluded from per-user totals because they have no durable account ID.

For WebRTC, the server receives the selected route for each peer connection. STUN and TURN intervals are closed when the route changes or the connection ends, then split across UTC calendar days in `webrtc_usage_daily`. The admin endpoint exposes daily, rolling-week, month-to-date, and year-to-date totals plus a daily series.

The usage migration is `backend/migrations/008_create_usage_tracking.sql`; `011_add_webrtc_connection_counts.sql` adds connection totals and must also be applied after the existing migrations.

### Virtual User avatars

The 15 fixed Virtual User identities are stored in `virtual_user_profiles`. An owner or admin may update a profile's display name, avatar URL, language level, personality, interests, speaking style, reply probability, or enabled state. Avatar binaries are not uploaded; only a validated HTTP(S) URL is stored. Active room presence is refreshed after a profile update.

### Admin analytics

The `/admin` application contains an authenticated Usage Analytics section:

- `/admin/users` returns each user's cumulative room time together with their role and account details.
- `/admin/webrtc-usage` returns STUN/TURN totals for daily, weekly, monthly, and yearly periods and a daily history series.
- Both endpoints require an active `owner` or `admin` session.

## Internationalization

Supported languages:

- English.
- Vietnamese.
- Chinese.
- Japanese.

Behavior:

- The app uses a small local i18n dictionary.
- The selected language is stored in `localStorage`.
- Home, ready access, room controls, chat labels, media status labels, and room connection errors must use translated text.
- Language switching is available only on Home to keep the in-room experience stable.

## Room URL And Ready Access Flow

Room URLs must be deterministic:

``` text
/room/room-1
/room/room-2
...
/room/room-12
```

Flow:

1. User clicks Join on a room card.
2. App navigates to `/room/:roomId`.
3. User is not connected to the room yet.
4. App shows a `Ready access` page.
5. If signed in with Google, the app uses the Google display name as the room nickname.
6. If not signed in, the user enters a nickname on the `Ready access` page.
7. User clicks `Ready access`.
8. App emits `join-room`.
9. Only after this step does the user really enter the room and initialize media/WebRTC.

Reload behavior:

- If the browser reloads on `/room/:roomId`, the app opens the same room URL.
- Reloaded users must see the `Ready access` page first.
- They should not auto-join until clicking `Ready access`.

Navigation:

- Ready page has `Back to rooms`.
- Room connection failure overlay has `Back to rooms`.
- Leaving room returns to `/`.
- Browser tab close, browser close, reload, or page navigation should proactively emit `leave-room` when possible.

## Presence Reliability

- Users who leave normally should be removed from the room immediately.
- Users who close the tab/browser or lose connection should be removed by Socket.IO heartbeat detection.
- Production heartbeat target is a short detection window of about 6 seconds by using 3-second ping interval and 3-second ping timeout.
- The backend should broadcast updated room users and room counts after a user leaves or is disconnected.

## Nickname

- A nickname is still required before joining a room.
- Authenticated users always use their Google display name as the room nickname.
- Guests enter a nickname on the `Ready access` page.
- Guest nickname is stored in `localStorage`.
- Updating the nickname input updates `localStorage`.
- On page reload, guest nickname is restored from `localStorage`.

## User Avatar

- Authenticated user information uses the Google avatar URL stored in the database.
- The Google avatar URL is rendered directly by the frontend.
- The backend must not proxy, cache, upload, or store Google avatar image binaries.
- Guests receive a random basic cute avatar when joining; authenticated users use their Google avatar URL.
- Avatar is generated by the backend and stored in RAM with the room user.
- Avatar is sent with:
  - `room-users`
  - `user-joined`
  - `receive-message`
  - `chat-history`
- Avatar is shown:
  - When camera is off.
  - When camera is unavailable.
  - Before a media stream exists.
  - Next to nickname in chat messages.

## Video Call

- Responsive grid.
- Target desktop layout is 2x2 for up to 4 users.
- Single-user rooms should center the user.
- Three-user rooms should keep the second row visually balanced.
- Mobile room layout should fit the viewport without unnecessary page scrolling.
- Mobile video tiles should use a portrait-friendly shape.
- Users can click a participant tile to open stage/presentation mode.
- Stage mode shows the selected participant large in the room.
- In stage mode, all participants remain visible as smaller thumbnails in one row at the bottom.
- The selected participant thumbnail remains visible in the thumbnail row.
- Show nickname.
- Show avatar.
- Show mic status.
- Show camera status.
- Auto rearrange when users leave.
- Remote users must still appear as avatar placeholders even if no media stream exists.
- Camera video should be mirrored so users see themselves naturally.
- Screen share video must not be mirrored and must fit fully inside the stage frame without cropping.

## Screen Sharing

- Users can share their screen from the room toolbar when the browser supports `getDisplayMedia`.
- Only one user in a room can share screen at a time.
- When one user is sharing screen, other users cannot start screen sharing.
- If a user starts screen sharing, that user is automatically opened in stage mode for everyone in the room.
- Screen share video is shown in the large stage frame.
- The sharing user's thumbnail should show their normal camera state or avatar, not a duplicate of the shared screen.
- Users can keep camera and microphone active while sharing screen.
- If supported by the browser/source, screen share audio should be sent to other users.
- Screen sharing is P2P through WebRTC; the server does not relay screen video or audio.
- The client tracks the active `screenTrackId` so camera video and screen share video are not confused when both are active.
- If screen sharing is unsupported or denied, show a translated in-room media notice and keep the user connected normally.

## Toolbar

Controls:

- Toggle microphone.
- Toggle camera.
- Toggle screen sharing.
- Leave room.

Default state:

- Microphone is off when entering a room.
- Camera is off when entering a room.
- User sees avatar by default.

Media availability:

- If no microphone is detected, the mic button is disabled and cannot enable mic.
- If no camera is detected, the camera button is disabled and cannot enable camera.
- If microphone is disconnected while in room, mic is automatically disabled.
- If camera is disconnected while in room, camera is automatically disabled.
- Device changes are monitored via browser `devicechange` when available.

Secure origin behavior:

- Browser media APIs require HTTPS or localhost.
- On plain LAN HTTP such as `http://192.168.x.x`, mic/camera may be unavailable.
- The app must not crash in that case.
- Users can still enter rooms with avatar-only mode, chat, and presence.

## Speaking Indicator

- Active speaker detection is client-side.
- Use local audio analysis with Web Audio API.
- Use RMS-based volume detection.
- Use smoothing and hysteresis to reduce false positives from noise.
- Highlight speaking user with:
  - Green border.
  - Mic volume bars.
  - Speaking badge.
  - Avatar pulse when camera is off.

## Chat

Right-side fixed panel, about `320px` wide.

Features:

- Realtime text chat.
- Timestamp in `HH:mm`.
- Nickname.
- Avatar.
- Enter to send.
- Send button.
- Quick emoji buttons.
- Auto-scroll to bottom when new messages arrive or when user sends a message.
- On mobile, chat is collapsible and scrolls to bottom when opened.

Chat history:

- Chat history is stored in server RAM per room.
- When a new user joins a room, server sends existing room chat via `chat-history`.
- History is not persisted across server restart.

## Quick Emoji

Buttons:

- 😀
- 😂
- 👍
- ❤️
- 👏
- 🎉
- ✋
- 🤔

Clicking an emoji sends it immediately as a chat message.

## Room Connection Errors

If a user cannot connect to the room:

- Show a clear in-room error overlay.
- Include a `Back to rooms` button.
- The user must be able to return to Home without refreshing the browser.

Trigger cases:

- Socket disconnected while in room.
- Socket connect error.
- No `room-users` confirmation after joining within a timeout.
- Server emits `room-full`.
- Server emits `join-error`.

## Memory Model

Store all room state in RAM only.

Example:

``` ts
rooms = {
  roomId: {
    users: [
      {
        socketId,
        nickname,
        avatar,
        micEnabled,
        cameraEnabled,
        screenSharing,
        screenTrackId
      }
    ],
    messages: [
      {
        id,
        roomId,
        socketId,
        nickname,
        avatar,
        text,
        timestamp
      }
    ]
  }
}
```

## Socket Events

Client to server:

- `join-room`
- `leave-room`
- `send-message`
- `media-status`
- `offer`
- `answer`
- `ice-candidate`

Server to client:

- `room-list`
- `room-users`
- `chat-history`
- `room-full`
- `join-error`
- `user-joined`
- `user-left`
- `user-media-status`
- `screen-share-denied`
- `receive-message`
- `offer`
- `answer`
- `ice-candidate`

## UI

Dark mode by default.

Desktop:

- Video left.
- Chat right.
- Chat panel fixed at about `320px`.

Mobile:

- Video full width.
- Chat collapsible.
- Chat can be hidden with a mobile swipe gesture.
- Room access and error states must be usable on small screens.

## Deployment

Frontend:

- GitHub Pages.
- Vite base path must support repository subpath deployment.
- SPA fallback must support direct access and reload on `/room/:roomId`.
- The frontend build must produce a `404.html` fallback for GitHub Pages.

Backend:

- Render.
- Connect to Neon Postgres with `DATABASE_URL`.
- Configure CORS with comma-separated `CLIENT_ORIGIN` values.
- Socket.IO should use short heartbeat settings so closed tabs or browsers are removed from rooms quickly.
- Run all SQL files in `backend/migrations` in numeric order before enabling Google Sign-In, including `008_create_usage_tracking.sql` for usage tables and `011_add_webrtc_connection_counts.sql` for STUN/TURN connection counts.

Database:

- Neon Postgres.
- Use the pooled connection string for serverless-style deployment if required by the hosting plan.
- Keep database usage limited to authenticated profiles, Virtual User profiles, moderation records, and usage aggregates.

Environment:

- Backend:
  - `PORT`
  - `CLIENT_ORIGIN`
  - `DATABASE_URL`
  - `GOOGLE_CLIENT_ID`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
- Frontend:
  - `VITE_SOCKET_URL`
  - `VITE_API_URL`
  - `VITE_GOOGLE_CLIENT_ID`

LAN testing:

- Frontend can be served with Vite `--host 0.0.0.0`.
- Backend must listen on a LAN-reachable port.
- `VITE_SOCKET_URL` must use the host machine LAN IP, not `localhost`.
- Mic/camera generally require HTTPS or localhost; LAN HTTP may only support avatar/chat/presence.

## Code Requirements

- TypeScript everywhere.
- Clean architecture.
- Reusable React hooks.
- Separate UI, Socket.IO, media, and WebRTC logic.
- Keep dependencies minimal.
- No heavyweight auth framework.
- No media relay server.

## Deliverables

Project structure:

- `frontend/`
- `backend/`
- `README.md`
- `.env.example`

The application must run locally with:

``` bash
npm install
npm run dev
```

Quality checks:

``` bash
npm run typecheck
npm run build
```
