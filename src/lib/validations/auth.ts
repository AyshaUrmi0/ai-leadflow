import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "Email is required." })
    .email({ message: "Invalid email address format." }),
  password: z
    .string()
    .min(1, { message: "Password is required." }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(100, { message: "Name must be 100 characters or less." }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "Email is required." })
    .email({ message: "Invalid email address format." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(100, { message: "Password must be 100 characters or less." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
