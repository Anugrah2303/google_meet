import { z } from "zod";

export const chatSchema = z.object({
  message: z.string().trim().min(1, "Type a message").max(2000, "Message is too long (max 2000 characters)"),
});
