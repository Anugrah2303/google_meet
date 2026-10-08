import mongoose from "mongoose";
import { MESSAGE_TYPES } from "../constants/index.js";

const messageSchema = new mongoose.Schema(
  {
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null for SYSTEM messages
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    type: { type: String, enum: Object.values(MESSAGE_TYPES), default: MESSAGE_TYPES.TEXT },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ meeting: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
