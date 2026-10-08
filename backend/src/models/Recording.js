import mongoose from "mongoose";
import { RECORDING_STATUS, STORAGE_PROVIDERS } from "../constants/index.js";

const recordingSchema = new mongoose.Schema(
  {
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, default: "" },
    url: { type: String, default: "" },
    duration: { type: Number, default: 0 }, // seconds
    size: { type: Number, default: 0 }, // bytes
    status: { type: String, enum: Object.values(RECORDING_STATUS), default: RECORDING_STATUS.RECORDING },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    storageProvider: { type: String, enum: Object.values(STORAGE_PROVIDERS) },
    publicId: { type: String, default: "" },
    resourceType: { type: String, default: "video" },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

recordingSchema.index({ meeting: 1 });

export default mongoose.model("Recording", recordingSchema);
