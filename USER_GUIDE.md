# Talking Room - For Me Talk User Guide

Talking Room - For Me Talk is a lightweight voice, video, and chat application for language practice, personal conversations, and real-time connection. It is designed around small rooms, simple access, and clear role-based permissions so the product can grow safely over time.

## 1. Getting Started

Open the application home page to see the available talking rooms. Each room card shows the room name, the current number of connected users, and the room capacity.

You can use the app as either:

- a guest, without signing in;
- a signed-in user, using Google Sign-In;
- an admin user, if your email has been granted admin access.

The app supports multiple interface languages. Use the language selector on the home page to switch the UI language.

## 2. Joining a Room

To join a room:

1. Select an available room from the room list.
2. Review the room access screen.
3. Confirm or enter your display name.
4. Click the ready access button to enter the room.

If you are not signed in, the app suggests a guest name automatically. For example, if there are already two people in the room, the suggested name will be `Talking User 3`. You can keep this suggested name or type your own.

If you are signed in, the app uses your Google display name.

Rooms have a maximum capacity of 4 connected users. If a room is full, the join button is disabled.

## 3. Inside a Room

Once inside a room, you can:

- speak with other users using your microphone;
- listen to other users in real time;
- send and read room chat messages;
- see participant tiles and active media states;
- leave the room at any time.

The microphone button is available when your device has a usable microphone.

The camera button is always visible. If your account does not have permission to use the camera, clicking the button opens an upgrade message explaining that camera access requires a higher account level.

Screen sharing is currently suspended, so the screen share button is hidden in the frontend.

## 4. Rooms

The app includes predefined rooms that are always available.

Verified and supporter users can also create new rooms. User-created rooms are temporary: when everyone leaves one of these rooms, the system waits 1 minute, then removes the room automatically if nobody reconnects. Predefined rooms are not removed.

## 5. User Roles and Permissions

The app currently has three regular user roles.

| Role | Join rooms | Use microphone | Use chat | Create rooms | Use camera |
| --- | --- | --- | --- | --- | --- |
| Unverified | Yes | Yes | Yes | No | No |
| Verified | Yes | Yes | Yes | Yes | No |
| Supporter | Yes | Yes | Yes | Yes | Yes |

### Unverified Users

Unverified users can join rooms, talk with the microphone, and use room chat. They cannot create new rooms and cannot enable the camera.

This is the default role for newly signed-in users unless an admin updates the role.

### Verified Users

Verified users can do everything unverified users can do, plus create new rooms.

Verified status is useful for trusted users who should be allowed to start their own conversations while keeping camera access limited.

### Supporter Users

Supporter users can do everything verified users can do, plus enable the camera in rooms.

This role is intended for higher-trust or higher-tier users.

## 6. Signing In

Use Google Sign-In from the home page to sign in.

After signing in, your user menu shows:

- your display name;
- your email address;
- your current user role;
- a sign-out action.

If your email also has admin access, the admin area link may appear in your user menu.

## 7. Admin Area

The admin area is available at `/admin`, but only eligible admin accounts can access it. If you open `/admin` without a valid admin session, the app redirects you back to the main page.

Admin access is separate from regular app user roles.

There are two admin roles:

| Admin role | Manage app users | Manage admin users |
| --- | --- | --- |
| Admin | Yes | No |
| Owner | Yes | Yes |

Admins and owners can open the user management page to search users and update regular user roles: `unverified`, `verified`, or `supporter`.

Only owners can open the admin management page. Owners can invite admin users, update admin roles, and suspend admin accounts. The system protects the final active owner from being removed or demoted.

## 8. Privacy and Contact Pages

The app includes public information pages:

- Privacy Policy;
- Contact Us;
- About Us.

For contact, use: `kimmanhcuong96@gmail.com`.

## 9. Troubleshooting

If you cannot join a room, check whether:

- the room is already full;
- your internet connection is active;
- the backend server is reachable;
- your browser allows microphone access.

If your camera does not turn on, check whether:

- your account role is `supporter`;
- your browser has camera permission;
- another application is not already using the camera.

If you are redirected away from `/admin`, your admin session may be missing, expired, suspended, or your email may not be listed as an admin account.

