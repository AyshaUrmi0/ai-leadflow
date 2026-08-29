import { z } from "zod";

export const createNoteSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  content: z
    .string()
    .trim()
    .min(1, "Note content cannot be empty")
    .max(2000, "Note content must not exceed 2000 characters"),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
