# Google Meet Clone - Backend

A beginner-friendly backend for a Google Meet-like video meeting app.
**Express + MongoDB + Socket.IO + WebRTC signaling**, written in plain JavaScript (ES Modules).

> Important: this server does **not** carry audio or video. Browsers send media directly to each other with WebRTC.
> The server handles accounts, meetings, chat, files, permissions, and the small "signaling" messages browsers need to find each other.

## 1. Features

Auth (JWT, cookie or Bearer) - meetings with human-readable codes - join/leave - participants with live state - WebRTC signaling (offer / answer / ICE) for many participants - mic / camera state - screen share state - real-time chat (REST + Socket.IO) - file sharing - recording upload + lifecycle - hand raise - featured participant - host / co-host roles - permission system with live updates - meeting history - validation, error handling, rate limit, helmet.

## 2. Tech stack

Node.js 18+, Express 4, MongoDB + Mongoose, Socket.IO, JWT, bcrypt, Zod, Multer, Cloudinary (optional), helmet, express-rate-limit.
Nodemailer is not included because no feature sends email (`isEmailVerified` exists on the user for future use).

## 3. Folder structure

```
backend/
├── src/
│   ├── configs/         db, cors, cloudinary, ICE servers
│   ├── constants/       roles, statuses, permissions, upload limits
│   ├── controllers/     one file per feature (auth, user, meeting, participant, message, file, recording)
│   ├── middlewares/     auth, meeting membership/permission, upload (multer), validation, errors
│   ├── models/          User, Meeting, Participant, Message, File, Recording
│   ├── routes/          /api/auth, users, meetings, messages, files, recordings
│   ├── services/        logic shared by REST and sockets (meeting, participant, permission, message, storage)
│   ├── sockets/         socketManager, socketAuth, meetingSocket, signalingSocket, chatSocket, participantSocket, permissionSocket, state
│   ├── validations/     Zod schemas
│   ├── utils/           sendResponse, asyncHandler, generateToken, generateMeetingCode, permissions, formatters ...
│   ├── app.js           Express app
│   └── index.js         starts HTTP server + MongoDB + Socket.IO
├── test/socket-client.js
├── uploads/             local file storage (when Cloudinary is not configured)
├── .env.example
└── package.json
```
(`types/` is not needed because this is JavaScript.)

If you already have a backend, copy the files into your matching folders and keep your own versions of `app.js` / `index.js` if you prefer; the only requirements are listed in "Wiring" below.

**Wiring**: `index.js` creates one HTTP server, passes it to Express and to `initSocket(server)`, and does `app.set("io", io)` so controllers can emit events with `req.app.get("io")`.

## 4. Installation

```bash
npm install
cp .env.example .env     # then edit .env
npm run dev              # nodemon
# or
npm start
```

## 5. Environment variables

| Variable | Meaning |
| --- | --- |
| PORT, SERVER_URL | Port and public URL of this backend (used for local file links) |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET, JWT_EXPIRES_IN, COOKIE_SECRET | Auth secrets. Use long random values |
| CLIENT_URL | Frontend URL (comma separated for several). CORS uses it, never `*` |
| CLOUDINARY_* | Optional. Empty = files go to `uploads/` |
| STUN_SERVER_URL, TURN_SERVER_URL, TURN_USERNAME, TURN_PASSWORD | WebRTC network helpers |

## 6. MongoDB setup

Local: install MongoDB Community and use `mongodb://127.0.0.1:27017/google-meet-clone`.
Cloud: create a free MongoDB Atlas cluster, add your IP, and paste the connection string into `MONGO_URI`.

## 7. Cloudinary setup (optional)

Create a free Cloudinary account, copy cloud name / API key / API secret into `.env`.
Files are stored under `google-meet-clone/meetings/{meetingId}/files`, recordings under `.../recordings`.
Without Cloudinary, files are saved in `uploads/` and served from `/uploads/...` with random file names.
For a real product use Cloudinary/S3 with signed URLs, because anybody with a local URL can open the file.

## 8. Database relationships

```
User ─┬─ hosts ──────▶ Meeting
      ├─ has ────────▶ Participant (one per user per meeting)
      ├─ writes ─────▶ Message
      ├─ uploads ────▶ File
      └─ records ────▶ Recording

Meeting ─┬─ host            (User)
         ├─ participants    (Users who ever joined)
         └─ referenced by Participant, Message, File, Recording (field: meeting)
```

**MongoDB vs Socket.IO memory**
- MongoDB (Participant) = permanent history: who joined, when, role, last known state.
- `sockets/state.js` (memory) = who is connected *right now* and with which socket id.
- On server start all participants are reset to offline, because every socket died with the old process.

## 9. REST API

All routes except register/login need a token: `Authorization: Bearer <token>` or the `token` cookie.
Responses: `{ success, message, data }` or `{ success: false, message, error }`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout (clears cookie) |
| GET | /api/auth/me | Current user |
| GET | /api/users/me | My profile |
| PATCH | /api/users/me | Update name |
| PATCH | /api/users/me/avatar | Upload avatar (form field `avatar`) |
| GET | /api/users/:id | Public profile |
| POST | /api/meetings | Create meeting `{ title, scheduledAt?, settings? }` |
| GET | /api/meetings | My meetings |
| GET | /api/meetings/history | Meetings I joined, with durations |
| GET | /api/meetings/ice-servers | STUN/TURN config for RTCPeerConnection |
| GET | /api/meetings/code/:meetingCode | Find by code (public info) |
| GET | /api/meetings/:meetingId | Meeting details (members only) |
| POST | /api/meetings/:meetingId/join | Register as member `{ displayName? }` |
| POST | /api/meetings/:meetingId/leave | Leave |
| PATCH | /api/meetings/:meetingId | Update title/schedule (host) or settings (permission) |
| POST | /api/meetings/:meetingId/end | End meeting (host) |
| DELETE | /api/meetings/:meetingId | End + delete meeting data (host) |
| GET | /api/meetings/:meetingId/participants | List (`?online=true`) |
| GET | /api/meetings/:meetingId/participants/:participantId | One participant |
| POST/DELETE | .../participants/:participantId/feature | Feature / unfeature |
| POST | .../participants/:participantId/promote | Make co-host (host) |
| POST | .../participants/:participantId/demote | Remove co-host (host) |
| POST | .../participants/:participantId/remove | Remove from meeting |
| POST | .../participants/:participantId/mute | Mute participant |
| PATCH | .../participants/:participantId/permissions | Set co-host permissions `{ permissions: [] }` |
| GET/POST | /api/meetings/:meetingId/messages | List / send chat message |
| DELETE | /api/messages/:messageId | Delete message |
| GET/POST | /api/meetings/:meetingId/files | List / upload (form field `file`) |
| DELETE | /api/files/:fileId | Delete file |
| POST | /api/meetings/:meetingId/recordings/start | Start recording record |
| POST | /api/meetings/:meetingId/recordings/upload | Upload recording (field `recording` + body `recordingId`, `duration`) |
| POST | /api/meetings/:meetingId/recordings/:recordingId/complete | Mark completed |
| GET | /api/meetings/:meetingId/recordings | List recordings |
| DELETE | /api/recordings/:recordingId | Delete recording |

Status codes used: 200, 201, 400 (bad id), 401 (no/invalid token), 403 (not allowed), 404, 409 (conflict, e.g. meeting ended), 413 (file too large), 422 (validation), 500.

## 10. Socket.IO events

Connect with `io(SERVER_URL, { auth: { token } })`. The server verifies the JWT and sets `socket.user`.
It never trusts a user id, role or participant id sent by the client.
`participantId` in all events is the **Participant document id**, `socketId` is the Socket.IO connection id.

| Event | Direction | Purpose |
| --- | --- | --- |
| join-meeting `{meetingId, displayName?, isMuted?, isCameraOff?}` | Client → Server | Join room |
| join-meeting-success | Server → Client | Meeting, my participant, permissions, iceServers |
| join-meeting-error | Server → Client | Join failed |
| participants-list | Server → Client | Who is already inside (joiner only) |
| participant-joined | Server → Client | Someone joined |
| leave-meeting `{meetingId}` | Client → Server | Leave |
| participant-left | Server → Client | Someone left or disconnected |
| meeting-left | Server → Client | You are out of the room |
| meeting-ended | Server → Client | Host ended meeting |
| participant-updated | Server → Client | Participant data changed |
| webrtc-offer `{meetingId,toSocketId,sdp}` | Client → Server → Client | SDP offer (forwarded as `fromSocketId`) |
| webrtc-answer | Client → Server → Client | SDP answer |
| ice-candidate `{meetingId,toSocketId,candidate}` | Client → Server → Client | ICE candidate |
| peer-ready | Client → Server → Client | "My media is ready" |
| peer-disconnected | Server → Client | Close the RTCPeerConnection for that socket |
| toggle-mic `{meetingId,isMuted?}` | Client → Server | Mic state |
| participant-mic-changed | Server → Client | `{participantId,isMuted}` |
| toggle-camera `{meetingId,isCameraOff?}` | Client → Server | Camera state |
| participant-camera-changed | Server → Client | `{participantId,isCameraOff}` |
| start-screen-share / stop-screen-share | Client → Server | Screen share state |
| screen-share-started / screen-share-stopped | Server → Client | Someone presents / stops |
| send-message `{meetingId,message}` | Client → Server | Send chat |
| new-message | Server → Client | New chat message |
| message-history `{meetingId,limit?,before?}` | Client → Server → Client | Load older messages |
| delete-message `{meetingId,messageId}` | Client → Server | Delete message |
| message-deleted | Server → Client | Message removed |
| raise-hand / lower-hand `{meetingId, participantId?}` | Client → Server | Hand state (host can lower others) |
| hand-raised / hand-lowered | Server → Client | Hand state changed |
| feature-participant / unfeature-participant | Client → Server | Feature (host/co-host) |
| participant-featured / participant-unfeatured | Server → Client | Featured changed |
| mute-participant | Client → Server | Host mutes someone |
| remove-participant | Client → Server | Host removes someone |
| participant-removed | Server → Client | Someone was removed |
| promote-participant / demote-participant | Client → Server | Co-host management |
| participant-role-changed | Server → Client | Role + permissions changed |
| update-permissions `{meetingId, settings?, participantId?, permissions?}` | Client → Server | Change settings / co-host rights |
| permissions-updated | Server → Client | New settings + **your** permission list |
| file-shared / file-deleted | Server → Client | File events (triggered by REST upload/delete) |
| recording-started / recording-stopped / recording-processing / recording-completed | Server → Client | Recording lifecycle |
| socket-error | Server → Client | Any other event failed `{event,message}` |

### Rooms: `io.to` vs `socket.to`
Each meeting is a Socket.IO room named by the meeting id.
- `io.to(room).emit(...)` → everybody in the room **including** the sender (used for state changes so the sender's UI stays in sync).
- `socket.to(room).emit(...)` → everybody **except** the sender (used for `participant-joined`).
- `io.to(socketId).emit(...)` → exactly one client (used for WebRTC signaling).

## 11. How WebRTC works here (step by step)

1. User A joins: `join-meeting`. A gets `participants-list` (empty).
2. User B joins. B gets `participants-list` with A. A gets `participant-joined` for B.
3. B creates an `RTCPeerConnection` for A and adds its camera/mic tracks.
4. B calls `createOffer()`, then `setLocalDescription(offer)`. This **SDP offer** describes codecs and media.
5. B emits `webrtc-offer { meetingId, toSocketId: A.socketId, sdp }`.
6. Server checks both sockets are in the same meeting and forwards it only to A as `webrtc-offer { fromSocketId: B }`.
7. A creates a peer connection for B, calls `setRemoteDescription(offer)`, `createAnswer()`, `setLocalDescription(answer)`.
8. A emits `webrtc-answer { toSocketId: B.socketId, sdp }`; server forwards to B; B calls `setRemoteDescription(answer)`.
9. While this happens, each browser fires `onicecandidate`. Each candidate is sent with `ice-candidate` and the other side calls `addIceCandidate()`.
10. The browsers find a working network path and the connection opens.
11. Audio/video now flows **directly between the browsers**. The server is not involved.

When User C joins, C offers to A and B. So 3 users = 3 connections, 4 users = 6, and so on.

```
Browser B ──webrtc-offer──▶ Socket.IO server ──webrtc-offer──▶ Browser A
Browser B ◀─webrtc-answer── Socket.IO server ◀─webrtc-answer── Browser A
```

**Rule for beginners:** the newcomer always creates the offers. Existing users just wait for offers. That avoids both sides offering at once.

### SDP
SDP is a text description of a media session: which codecs, which tracks, encryption keys. The **browser creates it**, the backend only forwards it as an opaque object.

### ICE, STUN, TURN
- **ICE candidate** = one possible address (IP + port) where a browser can be reached.
- **STUN** server tells a browser its public address. Cheap, works on most networks.
- **TURN** server relays the media when a direct path is impossible (strict firewalls, mobile networks). It costs bandwidth, so run it separately (e.g. coturn). This project does not build one.

Frontend example (config comes from `join-meeting-success.iceServers` or `GET /api/meetings/ice-servers`):

```js
const pc = new RTCPeerConnection({ iceServers });
localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
pc.onicecandidate = (e) => e.candidate && socket.emit("ice-candidate", { meetingId, toSocketId, candidate: e.candidate });
pc.ontrack = (e) => attachStreamToVideo(e.streams[0]);
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
socket.emit("webrtc-offer", { meetingId, toSocketId, sdp: offer });
```

### Mesh vs SFU
This project uses a **mesh**: every participant connects to every other participant.
1 user is trivial, ~5 users is fine, 20+ users is too heavy because each browser uploads its video N-1 times.
Production systems like Google Meet use an **SFU** (Selective Forwarding Unit): each user uploads once and a media server forwards streams. An SFU is not implemented here.

## 12. Screen sharing

Browser: `navigator.mediaDevices.getDisplayMedia()` → add or replace the video track on each `RTCPeerConnection` (`sender.replaceTrack`) → renegotiate with a new offer if you add a track (send `streamType: "screen"` to tell the other side).
Backend: checks `CAN_SCREEN_SHARE`, allows **one presenter at a time**, stores `isScreenSharing`, and emits `screen-share-started` / `screen-share-stopped`. If the presenter leaves, the stop event is sent automatically.

## 13. Chat

`send-message` (or `POST /messages`) → server finds the sender from `socket.user` → checks the socket is in the meeting and `CAN_CHAT` → validates → saves to MongoDB → emits `new-message` to the room.
Late joiners call `message-history` or `GET /messages`. Message authors (and hosts/co-hosts) can delete.

## 14. File sharing

`POST /meetings/:id/files` (form field `file`). Order of checks: logged in → member → `CAN_SEND_FILE` → Multer (type + 25 MB limit) → store. Executables, scripts, html and svg are rejected. Everybody receives `file-shared`. Deleting removes the stored file too and emits `file-deleted`.

## 15. Recording

The server **cannot** record WebRTC calls (it never receives the media). The browser records with `MediaRecorder` and uploads the result:

```
Browser MediaRecorder → Blob → multipart/form-data → Express + Multer → Cloudinary or uploads/ → MongoDB metadata
```
Lifecycle:
1. `POST .../recordings/start` → status `RECORDING` → `recording-started`
2. Browser stops MediaRecorder, then `POST .../recordings/upload` with `recording` file + `recordingId` + `duration` → `recording-stopped`, `recording-processing`, status `PROCESSING` (or `FAILED`)
3. `POST .../recordings/:id/complete` → `COMPLETED` → `recording-completed` with the URL

A recording that never gets uploaded stays `RECORDING` and blocks a new one; the host can delete it.

## 16. Permissions

Meeting settings (host / co-host can change them live): `allowChat, allowScreenShare, allowFileShare, allowParticipantMic, allowParticipantCamera, allowRecording`.

| Permission | Controlled by |
| --- | --- |
| CAN_CHAT, CAN_SCREEN_SHARE (= CAN_SHARE_SCREEN), CAN_SEND_FILE, CAN_UNMUTE, CAN_ENABLE_CAMERA, CAN_RECORD | meeting setting, or granted to a co-host |
| CAN_REMOVE_PARTICIPANT, CAN_MANAGE_PARTICIPANTS | host, or a co-host who was granted it |

`hasPermission(participant, meeting, permission)` in `utils/permissions.js` is the single place that decides. Every action checks: logged in → member → role → setting → action.
**Hot updates:** when settings change, the server fixes the current state (for example mutes everybody if unmuting was disabled) and sends each connected client `permissions-updated` with its own recalculated list.

## 17. Host and co-host

- **Host** (creator): everything, including ending the meeting, assigning co-hosts, setting co-host permissions.
- **Co-host**: default has all permissions; the host can reduce them. A co-host can manage only normal participants, never the host or other co-hosts.
- **Participant**: limited by meeting settings; can raise/lower own hand, mute self.
- Removed participants cannot rejoin.
- "Featured" is only a flag. Only one participant is featured at a time; the frontend decides how to display it.

## 18. Participant flow

1. Register/login → get token.
2. `POST /meetings` (host) or `GET /meetings/code/:code` (guest).
3. `POST /meetings/:id/join` (optional, creates membership; the socket join also does this).
4. Socket connect with token → `join-meeting` → `participants-list` → negotiate WebRTC.
5. During the call: mic/camera/hand/screen/chat events.
6. `leave-meeting` or close the tab (disconnect is handled the same way).
7. Host `POST /meetings/:id/end` → everybody gets `meeting-ended`.

A scheduled meeting (future `scheduledAt`) can only be started by the host's first join. Instant meetings are `LIVE` immediately.

## 19. Testing with Postman

Create an environment with `baseUrl = http://localhost:5000/api`. For Bearer auth copy the `token` from login. Postman also keeps the cookie automatically.

1. **Register** `POST {{baseUrl}}/auth/register` `{"name":"Alice","email":"alice@test.com","password":"secret123"}`
2. **Login** `POST {{baseUrl}}/auth/login`
3. **Me** `GET {{baseUrl}}/auth/me`
4. **Create meeting** `POST {{baseUrl}}/meetings` `{"title":"Daily standup"}` → copy `data.meeting.id` and `meetingCode`
5. **Get meeting** `GET {{baseUrl}}/meetings/:id`
6. **Join** (use a second user, Bob) `POST {{baseUrl}}/meetings/:id/join`
7. **Participants** `GET {{baseUrl}}/meetings/:id/participants`
8. **Message** `POST {{baseUrl}}/meetings/:id/messages` `{"message":"Hello"}`
9. **Upload file** `POST {{baseUrl}}/meetings/:id/files` → Body form-data, key `file` (type File)
10. **Start recording** (host; or turn on `allowRecording` first with `PATCH /meetings/:id {"settings":{"allowRecording":true}}`) `POST {{baseUrl}}/meetings/:id/recordings/start`; then upload with form-data keys `recording` (File, a .webm) and `recordingId`, then `.../complete`
11. **Get recordings** `GET {{baseUrl}}/meetings/:id/recordings`
12. **End meeting** (host) `POST {{baseUrl}}/meetings/:id/end`

## 20. Testing Socket.IO

```bash
# terminal 1 (Alice)
node test/socket-client.js ALICE_TOKEN MEETING_ID "Hello from Alice"
# terminal 2 (Bob)
node test/socket-client.js BOB_TOKEN MEETING_ID
```
Bob sees Alice in `participants-list` and sends a fake offer; Alice answers and sends a fake ICE candidate. This proves signaling works without a browser. Postman can also open a Socket.IO request (New → Socket.IO) with the same events.

## 21. Production limitations

This is a learning/portfolio project, not Google's infrastructure. It uses Express, MongoDB, Socket.IO and a WebRTC mesh.
Known limits: in-memory room state works for a single server process only; no waiting room or meeting password; local file URLs are not signed; the recording is only as reliable as the host's browser; no email.

## 22. Future improvements

SFU (mediasoup, LiveKit), your own TURN servers, Redis adapter for Socket.IO and horizontal scaling, object storage + CDN with signed URLs, background workers for recording processing, waiting room / lobby, message queues, observability (logs, metrics, tracing), distributed presence, Kubernetes deployment, more rate limiting (including socket events).

## 23. Simple explanation

- **REST API** = permanent things: accounts, meetings, files. Like asking a clerk to look in a filing cabinet.
- **MongoDB** = the filing cabinet.
- **Socket.IO** = a live walkie-talkie channel for instant events: "Bob joined", "hand raised", "new chat".
- **WebRTC** = the direct video call between browsers.
- **Socket.IO does not carry the video.** It only helps browsers introduce themselves, like friends passing phone numbers (SDP and ICE) through a mutual friend. After that they call each other directly.
