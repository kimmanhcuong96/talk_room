# English Talk Rooms MVP Specification

## Goal

Build a lightweight web application for people to practice English
speaking.

### Principles

-   No database
-   No authentication
-   No OAuth
-   No persistence
-   Maximum 4 users per room
-   20 predefined rooms
-   Lowest possible server cost
-   WebRTC P2P for media

## Tech Stack

### Frontend

-   React
-   Vite
-   TypeScript
-   Tailwind CSS

### Backend

-   Node.js
-   Express
-   Socket.IO

### Realtime

-   WebRTC Mesh (P2P)

## Architecture

Server responsibilities only: - Room management - WebRTC signaling -
Chat messages - User join/leave

Never relay video/audio through the server.

## Rooms

Exactly 20 predefined rooms.

Each room: - Max 4 users - Hardcoded - No create/delete

Suggested names: - English Beginner - English Intermediate - Daily
Conversation - IELTS Speaking - Business English - Travel English -
Pronunciation Practice - Free Talk - Movie Discussion - Book Club -
Technology - Gaming - Culture Exchange - Debate - Vocabulary Practice -
Grammar Practice - Interview English - Coffee Chat - Weekend Talk -
Random Talk

## Home Page

Display: - Room name - Current users (x/4) - Join button

Disable Join when room is full.

## Join Flow

1.  User enters nickname.
2.  Select room.
3.  Join immediately.

No account or email.

## Video Call

-   Responsive 2x2 grid
-   Show nickname
-   Show mic status
-   Show camera status
-   Auto rearrange when users leave

## Toolbar

-   Toggle microphone
-   Toggle camera
-   Leave room

## Speaking Indicator

Client-side active speaker detection. Highlight active speaker with
green border.

## Chat

Right-side fixed panel (\~320px).

Features: - Realtime text chat - Timestamp (HH:mm) - Nickname - Enter to
send - Send button - No history

## Quick Emoji

Buttons: 😀 😂 👍 ❤️ 👏 🎉 ✋ 🤔

Click sends immediately as chat.

## Memory Model

Store everything in RAM only.

Example:

``` ts
rooms = {
  roomId: {
    users: [
      {
        socketId,
        nickname
      }
    ]
  }
}
```

## Socket Events

Client: - join-room - leave-room - send-message - offer - answer -
ice-candidate

Server: - room-users - user-joined - user-left - receive-message -
offer - answer - ice-candidate

## UI

Desktop: - Video left - Chat right

Mobile: - Video full width - Collapsible chat

Dark mode by default.

## Deployment

Frontend: - Vercel

Backend: - Railway or Render

Use Google public STUN server. TURN optional.

## Code Requirements

-   TypeScript everywhere
-   Clean architecture
-   Reusable React hooks
-   Separate UI, Socket.IO, and WebRTC logic
-   Keep dependencies minimal

## Deliverables

Produce a complete production-ready project including: - frontend/ -
backend/ - README.md - .env.example

The application must run locally with:

``` bash
npm install
npm run dev
```

and be easy to deploy.
