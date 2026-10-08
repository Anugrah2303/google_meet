export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB, same as the backend
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Mesh = every browser connects to every other browser. Gets heavy after ~6 people.
export const MESH_WARNING_THRESHOLD = 6;

export const ALLOWED_FILE_TYPES = [
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

export const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.zip";

// Meeting-wide switches (HostSettingsPanel)
export const SETTING_OPTIONS = [
  { key: "allowChat", label: "Chat", hint: "Everyone can send messages" },
  { key: "allowScreenShare", label: "Screen sharing", hint: "Everyone can present" },
  { key: "allowFileShare", label: "File sharing", hint: "Everyone can upload files" },
  { key: "allowParticipantMic", label: "Microphone", hint: "Participants can unmute themselves" },
  { key: "allowParticipantCamera", label: "Camera", hint: "Participants can turn their camera on" },
  { key: "allowRecording", label: "Recording", hint: "Everyone can record the meeting" },
];

// Personal permissions the host can give to a co-host
export const CO_HOST_PERMISSION_OPTIONS = [
  { key: "CAN_CHAT", label: "Chat" },
  { key: "CAN_SCREEN_SHARE", label: "Screen share" },
  { key: "CAN_SEND_FILE", label: "Send files" },
  { key: "CAN_UNMUTE", label: "Unmute" },
  { key: "CAN_ENABLE_CAMERA", label: "Camera" },
  { key: "CAN_RECORD", label: "Record" },
  { key: "CAN_REMOVE_PARTICIPANT", label: "Remove people" },
  { key: "CAN_MANAGE_PARTICIPANTS", label: "Manage people and settings" },
];

export const ROLE_LABELS = { HOST: "Host", CO_HOST: "Co-host", PARTICIPANT: "Participant" };
