# English Talk Rooms

Lightweight English speaking practice rooms built with React, Vite, TypeScript, Express, Socket.IO, and WebRTC mesh.

## Features

- 20 predefined rooms, maximum 4 users per room
- No database, authentication, OAuth, or persistence
- WebRTC peer-to-peer audio/video
- Socket.IO signaling and realtime chat
- Mic/camera toggles, active speaker highlight, responsive chat panel

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

Frontend:

- `VITE_SOCKET_URL`: Socket.IO server URL

## Deployment

- Frontend: deploy `frontend/` to GitHub Pages with the included GitHub Actions workflow.
- Backend: deploy `backend/` to Railway, Render, Koyeb, or another Node.js host.
- Configure `VITE_SOCKET_URL` to point to the deployed backend.
- Configure `CLIENT_ORIGIN` on the backend to the deployed frontend URL.

### GitHub Pages

1. In the GitHub repository, open **Settings > Pages**.
2. Set **Build and deployment > Source** to **GitHub Actions**.
3. Open **Settings > Secrets and variables > Actions > Variables**.
4. Add `VITE_SOCKET_URL` with the deployed backend URL, for example `https://your-app.onrender.com`.
5. Push to `master` or run **Deploy frontend to GitHub Pages** manually from the **Actions** tab.

The server only manages rooms, chat, presence, and WebRTC signaling. Audio and video are never relayed through the server.
