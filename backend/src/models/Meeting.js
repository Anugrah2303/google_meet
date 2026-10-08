import mongoose from "mongoose";
import { MEETING_STATUS } from "../constants/index.js";

const meetingSchema = new mongoose.Schema(
  {
    meetingCode: { type: String, required: true, unique: true, lowercase: true },
    title: { type: String, required: true, trim: true, maxlength: 100, default: "Untitled meeting" },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Every user who ever joined (used for "my meetings"). Live state is in Participant + Socket.IO.
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: Object.values(MEETING_STATUS), default: MEETING_STATUS.SCHEDULED },
    scheduledAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    settings: {
      allowChat: { type: Boolean, default: true },
      allowScreenShare: { type: Boolean, default: true },
      allowFileShare: { type: Boolean, default: true },
      allowParticipantMic: { type: Boolean, default: true },
      allowParticipantCamera: { type: Boolean, default: true },
      allowRecording: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);
