import mongoose from "mongoose";
import { STORAGE_PROVIDERS } from "../constants/index.js";

const fileSchema = new mongoose.Schema(
  {
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    storageProvider: { type: String, enum: Object.values(STORAGE_PROVIDERS), required: true },
    // Needed to delete the file later from Cloudinary / disk
    publicId: { type: String, default: "" },
    resourceType: { type: String, default: "raw" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

fileSchema.index({ meeting: 1 });

export default mongoose.model("File", fileSchema);
