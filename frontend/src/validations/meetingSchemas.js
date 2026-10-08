import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1, "Give your meeting a title").max(100, "Title must be at most 100 characters"),
  // value of <input type="datetime-local">, empty string means "start now"
  scheduledAt: z
    .string()
    .optional()
    .refine((value) => !value || new Date(value).getTime() > Date.now(), "Pick a time in the future"),
});

export const joinCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/, "The code looks like abc-defg-hij"),
});
