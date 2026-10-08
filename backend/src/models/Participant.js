import mongoose from "mongoose";
import { PARTICIPANT_ROLES, PERMISSIONS } from "../constants/index.js";

const participantSchema = new mongoose.Schema(
  {
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 50 },
    socketId: { type: String, default: null },
    role: { type: String, enum: Object.values(PARTICIPANT_ROLES), default: PARTICIPANT_ROLES.PARTICIPANT },
    // Extra permissions, only meaningful for CO_HOST (the host edits this list)
    permissions: [{ type: String, enum: Object.values(PERMISSIONS) }],
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    isCameraOff: { type: Boolean, default: false },
    isScreenSharing: { type: Boolean, default: false },
    isHandRaised: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isRemoved: { type: Boolean, default: false }, // removed by host, cannot rejoin
  },
  { timestamps: true }
);

// One participant record per user per meeting. Also makes "find by meeting" fast.
participantSchema.index({ meeting: 1, user: 1 }, { unique: true });

export default mongoose.model("Participant", participantSchema);
