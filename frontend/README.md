# Meetly - Google Meet clone (frontend)

React + Vite + Tailwind v4 frontend for the Express / MongoDB / Socket.IO backend.
Video and audio use native WebRTC (mesh), screen share uses `getDisplayMedia`, recording uses `MediaRecorder`.

## Setup

```bash
npm install
cp .env.example .env     # already created for you, edit if your backend runs elsewhere
npm run dev              # http://localhost:5173
```

`.env`:

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Camera and microphone only work on `http://localhost` or on HTTPS. Opening the app through a LAN IP
such as `http://192.168.1.20:5173` will NOT give you camera access.

## Run with the backend

1. Start MongoDB, then in the backend folder: `cp .env.example .env`, fill it in, `npm run dev` (port 5000).
2. In the backend `.env` set `CLIENT_URL=http://localhost:5173` (CORS + cookies).
3. Start this frontend with `npm run dev`.

## Test with two people on one computer

1. Window A (normal): register user A, click "Create meeting", allow camera and microphone.
2. Window B (incognito, so it has its own login): register user B.
3. In window A open "Meeting details" (info button) and copy the code.
4. In window B paste the code under "Join with a code", press Join, then "Join now".
5. Try: mute, camera, raise hand, chat, file upload, screen share, record, host menu on B's tile (feature, mute, co-host, remove).
6. Turn headphones on, or mute one window, to avoid audio feedback.

Production build with `npm run build`; check code with `npm run lint`.

## REST vs Socket.IO vs WebRTC

- REST (Axios): "do one thing and get an answer": log in, create a meeting, list history, upload a file. Cached by React Query.
- Socket.IO: a permanent two-way line to the server. Used for everything live: who joined, who muted, chat, hand raised, and the small signaling messages WebRTC needs.
- WebRTC: a direct line between two browsers for audio and video. The backend never sees the media.

## Offer / answer / ICE

```
Browser A (newcomer)                    Backend                       Browser B (already inside)
  join-meeting  ------------------------>
  <-- participants-list (B is inside)
  createOffer, setLocalDescription
  webrtc-offer {toSocketId: B} --------->  forwards  ------------------------->
                                                                     setRemoteDescription(offer)
                                                                     createAnswer, setLocalDescription
                         <-------------  forwards  <-------------- webrtc-answer
  setRemoteDescription(answer)
  ice-candidate  ----------------------->  forwards  ------------------------->  addIceCandidate
                 <-----------------------  forwards  <------------------------- ice-candidate
  ======================= audio / video flows directly A <-> B =======================
```

- Offer / answer = "here is what I can send and receive" (SDP text).
- ICE candidates = possible network routes. STUN finds your public address, TURN relays when a direct route is impossible.
- Candidates that arrive before the remote description is set wait in `pendingCandidates`.
- The newcomer always offers; people inside only answer. If two people join at the same moment, the "polite" side (smaller socket id) drops its own offer.

## Folder map

- `src/api` one file per backend resource, `src/stores` Zustand (auth, live meeting, UI panels)
- `src/hooks` `useMediaStream`, `useMeetingSocket` (all socket events -> store), `useWebRTC` (peers), `useScreenShare`, `useRecorder`
- `src/components/meeting` the room: grid, tiles, controls, panels
- `src/pages` Landing, Login, Register, Home, MeetingRoom, NotFound
