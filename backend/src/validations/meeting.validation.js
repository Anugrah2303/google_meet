import { z } from "zod";
import { PERMISSIONS } from "../constants/index.js";

// Every field is optional so the host can change one setting at a time
export const settingsSchema = z
  .object({
    allowChat: z.boolean(),
    allowScreenShare: z.boolean(),
    allowFileShare: z.boolean(),
    allowParticipantMic: z.boolean(),
    allowParticipantCamera: z.boolean(),
    allowRecording: z.boolean(),
  })
  .partial()
  .strict();

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(100).default("Untitled meeting"),
  scheduledAt: z.coerce.date().optional(),
  settings: settingsSchema.optional(),
});

export const updateMeetingSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    scheduledAt: z.coerce.date().optional(),
    settings: settingsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const joinMeetingSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
});

export const meetingCodeSchema = z.object({
  meetingCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/, "Meeting code must look like abc-defg-hij"),
});

export const permissionsSchema = z.object({
  permissions: z.array(z.enum(Object.values(PERMISSIONS))).max(20),
});
