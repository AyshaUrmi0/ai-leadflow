import { z } from "zod";
import { TaskStatus } from "@prisma/client";

export const taskStatusValues = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const createTaskSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must not exceed 200 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must not exceed 2000 characters")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  dueDate: z
    .union([z.coerce.date(), z.string().length(0)])
    .optional()
    .transform((val) => (val instanceof Date && !isNaN(val.getTime()) ? val : undefined)),
  assignedToId: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  status: z.nativeEnum(TaskStatus),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
