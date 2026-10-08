import Meeting from "../models/Meeting.js";
import Participant from "../models/Participant.js";
import ApiError from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { MEETING_STATUS } from "../constants/index.js";
import { getSocketInfo } from "./state.js";

/*
  Wraps a socket event handler so an error never crashes the server.
  The client receives "socket-error" with a readable message (or `errorEvent` if given).
*/
export function safeHandler(socket, eventName, handler, errorEvent = "socket-error") {
  return async (payload) => {
    try {
      await handler(payload && typeof payload === "object" ? payload : {});
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Something went wrong";
      if (!(error instanceof ApiError)) console.error(`Socket event "${eventName}" failed:`, error);
      socket.emit(errorEvent, { event: eventName, message });
    }
  };
}

/*
  Every event after join-meeting calls this.
  It proves the socket really is inside that meeting (using server memory, not client data),
  then loads fresh meeting + participant documents for permission checks.
*/
export async function getMeetingContext(socket, meetingId) {
  validateObjectId(meetingId, "meetingId");

  const info = getSocketInfo(socket.id);
  if (!info || info.meetingId !== String(meetingId)) {
    throw new ApiError(403, "You have not joined this meeting");
  }

  const [meeting, participant] = await Promise.all([
    Meeting.findById(info.meetingId),
    Participant.findById(info.participantId),
  ]);

  if (!meeting) throw new ApiError(404, "Meeting not found");
  if (meeting.status === MEETING_STATUS.ENDED) throw new ApiError(409, "This meeting has ended");
  if (!participant || participant.isRemoved) throw new ApiError(403, "You are no longer in this meeting");

  return { meeting, participant };
}
