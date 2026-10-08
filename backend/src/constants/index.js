export const USER_ROLES = { USER: "USER", ADMIN: "ADMIN" };

export const MEETING_STATUS = { SCHEDULED: "SCHEDULED", LIVE: "LIVE", ENDED: "ENDED" };

export const PARTICIPANT_ROLES = { HOST: "HOST", CO_HOST: "CO_HOST", PARTICIPANT: "PARTICIPANT" };

export const MESSAGE_TYPES = { TEXT: "TEXT", SYSTEM: "SYSTEM" };

export const RECORDING_STATUS = {
  RECORDING: "RECORDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

export const STORAGE_PROVIDERS = { LOCAL: "LOCAL", CLOUDINARY: "CLOUDINARY" };

export const PERMISSIONS = {
  CAN_CHAT: "CAN_CHAT",
  CAN_SCREEN_SHARE: "CAN_SCREEN_SHARE",
  CAN_SEND_FILE: "CAN_SEND_FILE",
  CAN_UNMUTE: "CAN_UNMUTE",
  CAN_ENABLE_CAMERA: "CAN_ENABLE_CAMERA",
  CAN_RECORD: "CAN_RECORD",
  CAN_SHARE_SCREEN: "CAN_SHARE_SCREEN", // alias of CAN_SCREEN_SHARE
  CAN_REMOVE_PARTICIPANT: "CAN_REMOVE_PARTICIPANT",
  CAN_MANAGE_PARTICIPANTS: "CAN_MANAGE_PARTICIPANTS",
};

// "Feature" permissions are switched on/off for everybody by meeting.settings
export const PERMISSION_TO_SETTING = {
  CAN_CHAT: "allowChat",
  CAN_SCREEN_SHARE: "allowScreenShare",
  CAN_SHARE_SCREEN: "allowScreenShare",
  CAN_SEND_FILE: "allowFileShare",
  CAN_UNMUTE: "allowParticipantMic",
  CAN_ENABLE_CAMERA: "allowParticipantCamera",
  CAN_RECORD: "allowRecording",
};

// "Management" permissions are only for host, or co-hosts that were given them
export const MANAGEMENT_PERMISSIONS = [
  PERMISSIONS.CAN_REMOVE_PARTICIPANT,
  PERMISSIONS.CAN_MANAGE_PARTICIPANTS,
];

export const DEFAULT_CO_HOST_PERMISSIONS = Object.values(PERMISSIONS);

// Uploads
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_RECORDING_SIZE = 500 * 1024 * 1024; // 500 MB
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

export const ALLOWED_FILE_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// MediaRecorder in browsers usually produces webm
export const ALLOWED_RECORDING_MIME_TYPES = ["video/webm", "video/mp4", "audio/webm"];

export const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".msi", ".sh", ".js", ".mjs", ".jar", ".vbs",
  ".ps1", ".scr", ".dll", ".apk", ".php", ".py", ".html", ".htm", ".svg",
];
