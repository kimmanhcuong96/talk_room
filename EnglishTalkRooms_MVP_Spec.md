# English Talk Rooms MVP Specification

## Goal

Build a lightweight web application for people to practice English speaking in small public rooms.

## Principles

- No database.
- No authentication.
- No OAuth.
- Runtime state is stored in server RAM only.
- Maximum 4 users per room.
- Exactly 20 predefined rooms.
- Lowest possible server cost.
- WebRTC mesh peer-to-peer for audio/video media.
- The server must never relay audio or video.

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

Client responsibilities:

- UI rendering.
- Local nickname persistence in `localStorage`.
- Local language preference persistence in `localStorage`.
- Client-side i18n rendering.
- Local media capture and device availability checks.
- Screen sharing capture when supported by the browser.
- WebRTC peer connection management.
- Client-side active speaker detection.
- Responsive video/chat layout.

## Rooms

Exactly 20 predefined rooms.

Each room:

- Has a deterministic id: `room-1` through `room-20`.
- Has a stable URL: `/room/:roomId`.
- Max 4 users.
- Hardcoded.
- No create/delete in the MVP, even though the UI may include a disabled or placeholder "Create a new group" action.

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
- Nickname input.
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
- Join is disabled when nickname is empty or room is full.
- Search filters rooms by topic/name.
- Density selector changes room grid density.
- Language can be changed only on Home.
- Language selection is persisted and reused after reload.

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
/room/room-20
```

Flow:

1. User enters nickname on Home.
2. User clicks Join on a room card.
3. App navigates to `/room/:roomId`.
4. User is not connected to the room yet.
5. App shows a `Ready access` page.
6. User may review or edit nickname.
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

- No account or email.
- Nickname is required before joining.
- Nickname is stored in `localStorage`.
- Updating the nickname input updates `localStorage`.
- On page reload, nickname is restored from `localStorage`.

## User Avatar

- Each user receives a random basic cute avatar when joining a room.
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
- Configure CORS with comma-separated `CLIENT_ORIGIN` values.
- Socket.IO should use short heartbeat settings so closed tabs or browsers are removed from rooms quickly.

Environment:

- Backend:
  - `PORT`
  - `CLIENT_ORIGIN`
- Frontend:
  - `VITE_SOCKET_URL`

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
- No database client.
- No auth framework.
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
