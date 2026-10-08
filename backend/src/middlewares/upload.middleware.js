import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import ApiError from "../utils/ApiError.js";
import {
  ALLOWED_FILE_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_RECORDING_MIME_TYPES,
  BLOCKED_EXTENSIONS,
  MAX_AVATAR_SIZE,
  MAX_FILE_SIZE,
  MAX_RECORDING_SIZE,
} from "../constants/index.js";

// Uploads first land in uploads/tmp, then storage.service moves them to their final place
const tmpDir = path.resolve("uploads", "tmp");
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    // Random name so users cannot overwrite each other or guess file URLs
    let ext = path.extname(file.originalname).toLowerCase();
    if (!/^\.[a-z0-9]{1,10}$/.test(ext)) ext = "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

// "video/webm;codecs=vp9" -> "video/webm"
const cleanMime = (mimetype) => mimetype.split(";")[0].trim().toLowerCase();

function makeFilter(allowedMimeTypes) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new ApiError(400, "This file type is not allowed"));
    }
    if (!allowedMimeTypes.includes(cleanMime(file.mimetype))) {
      return cb(new ApiError(400, `File type ${file.mimetype} is not supported`));
    }
    cb(null, true);
  };
}

export const uploadMeetingFile = multer({
  storage,
  fileFilter: makeFilter(ALLOWED_FILE_MIME_TYPES),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single("file");

export const uploadRecordingFile = multer({
  storage,
  fileFilter: makeFilter(ALLOWED_RECORDING_MIME_TYPES),
  limits: { fileSize: MAX_RECORDING_SIZE, files: 1 },
}).single("recording");

export const uploadAvatarFile = multer({
  storage,
  fileFilter: makeFilter(ALLOWED_IMAGE_MIME_TYPES),
  limits: { fileSize: MAX_AVATAR_SIZE, files: 1 },
}).single("avatar");

export { cleanMime };
