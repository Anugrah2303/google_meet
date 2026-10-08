import Meeting from "../models/Meeting.js";
import Participant from "../models/Participant.js";
import ApiError from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { formatMeeting, formatParticipant } from "../utils/formatters.js";
import { getEffectivePermissions, hasPermission } from "../utils/permissions.js";
import { getIceServers } from "../configs/iceServers.js";
import { PERMISSIONS } from "../constants/index.js";
import {
  getOnlineParticipants,
  leaveMeeting,
  markParticipantOnline,
  registerParticipant,
} from "../services/meeting.service.js";
import { getSocketInfo } from "./state.js";
import { safeHandler } from "./socketUtils.js";

export function registerMeetingHandlers(io, socket) {
  /*
    join-meeting
    Client -> Server: { meetingId, displayName?, isMuted?, isCameraOff? }

    Server checks the user, the meeting and the permissions, then:
    - the joiner gets  join-meeting-success + participants-list (who is already inside)
    - everybody else gets participant-joined
  */
  socket.on(
    "join-meeting",
    safeHandler(
      socket,
      "join-meeting",
      async ({ meetingId, displayName, isMuted, isCameraOff }) => {
        validateObjectId(meetingId, "meetingId");

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) throw new ApiError(404, "Meeting not found");

        // One socket can only be in one meeting at a time
        if (getSocketInfo(socket.id)) await leaveMeeting(io, socket.id, "switched-meeting");

        // Same user opened a second tab? The newest connection wins.
        const existing = await Participant.findOne({ meeting: meeting._id, user: socket.user._id });
        if (existing?.isOnline && existing.socketId && existing.socketId !== socket.id) {
          await leaveMeeting(io, existing.socketId, "joined-from-another-device");
        }

        const cleanName = String(displayName || "").trim().slice(0, 50);
        const participant = await registerParticipant(meeting, socket.user, cleanName || undefined);

        // Start muted / camera off if the host does not allow participants to use them
        const startMuted = isMuted === true || !hasPermission(participant, meeting, PERMISSIONS.CAN_UNMUTE);
        const startCameraOff =
          isCameraOff === true || !hasPermission(participant, meeting, PERMISSIONS.CAN_ENABLE_CAMERA);

        await markParticipantOnline(participant, socket, { isMuted: startMuted, isCameraOff: startCameraOff });

        // Build the list of people already inside (everybody online except me)
        const online = await getOnlineParticipants(meeting._id);
        const me = online.find((p) => String(p._id) === String(participant._id));
        const others = online.filter((p) => String(p._id) !== String(participant._id));

        await meeting.populate("host", "name avatar");

        socket.emit("join-meeting-success", {
          meeting: formatMeeting(meeting),
          participant: formatParticipant(me),
          permissions: getEffectivePermissions(participant, meeting),
          iceServers: getIceServers(),
        });

        // The new user starts a WebRTC connection (offer) to every user in this list
        socket.emit("participants-list", {
          meetingId: String(meeting._id),
          participants: others.map(formatParticipant),
        });

        // socket.to(room) = everyone in the room EXCEPT the sender
        socket.to(String(meeting._id)).emit("participant-joined", {
          meetingId: String(meeting._id),
          participant: formatParticipant(me),
        });

        console.log(`User joined meeting: ${participant.displayName} -> ${meeting.meetingCode}`);
      },
      "join-meeting-error"
    )
  );

  // leave-meeting: Client -> Server: { meetingId }
  socket.on(
    "leave-meeting",
    safeHandler(socket, "leave-meeting", async ({ meetingId }) => {
      const info = getSocketInfo(socket.id);
      if (!info || info.meetingId !== String(meetingId)) throw new ApiError(403, "You have not joined this meeting");
      await leaveMeeting(io, socket.id, "left");
    })
  );

  // Browser closed, wifi dropped, etc.
  socket.on("disconnect", async (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
    try {
      await leaveMeeting(io, socket.id, "disconnected");
    } catch (error) {
      console.error("Error while cleaning up after disconnect:", error);
    }
  });
}
