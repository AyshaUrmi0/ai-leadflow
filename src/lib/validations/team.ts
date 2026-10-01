import { z } from "zod";
import { Role } from "@prisma/client";

export const createTeamMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Full name is required." })
    .max(100, { message: "Name must be 100 characters or less." })
    .refine((val) => val.trim().length > 0, {
      message: "Full name cannot be empty or solely whitespace.",
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "Email address is required." })
    .max(255, { message: "Email must be 255 characters or less." })
    .email({ message: "Invalid email address format." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(100, { message: "Password must be 100 characters or less." }),
  role: z.enum([Role.ADMIN, Role.USER], {
    message: "Role must be either ADMIN or USER.",
  }).default(Role.ADMIN),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

export const updateUserRoleSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, { message: "User ID is required." }),
  role: z.enum([Role.ADMIN, Role.USER], {
    message: "Role must be either ADMIN or USER.",
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
