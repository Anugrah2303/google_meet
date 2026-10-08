import Meeting from "../models/Meeting.js";
import Participant from "../models/Participant.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hasPermission } from "../utils/permissions.js";

// For routes like /meetings/:meetingId/...
// Loads the meeting and checks that the logged-in user is a member.
// Result: req.meeting and req.participant
export const loadMeetingMember = asyncHandler(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) throw new ApiError(404, "Meeting not found");

  const participant = await Participant.findOne({ meeting: meeting._id, user: req.user._id });
  if (!participant || participant.isRemoved) {
    throw new ApiError(403, "You are not a member of this meeting");
  }

  req.meeting = meeting;
  req.participant = participant;
  next();
});

// requirePermission("CAN_CHAT") must run after loadMeetingMember
export const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.participant, req.meeting, permission)) {
    return next(new ApiError(403, "You are not allowed to perform this action"));
  }
  next();
};

export const requireHost = (req, res, next) => {
  if (req.participant.role !== "HOST") {
    return next(new ApiError(403, "Only the host can perform this action"));
  }
  next();
};
