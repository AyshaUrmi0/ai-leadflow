import { z } from "zod";

export const serviceInterestOptions = [
  "Preventive care",
  "Restorative care",
  "Cosmetic consultations",
] as const;

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => value || undefined);

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: optionalTrimmedString(30),
  serviceInterest: optionalTrimmedString(100),
  message: optionalTrimmedString(1000),
  consentGiven: z.literal(true),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const leadStatusValues = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED_LOST"] as const;

export const updateLeadStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(leadStatusValues),
});

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

export const adminLeadsQuerySchema = z.object({
  status: z.enum(leadStatusValues).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "email", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AdminLeadsQuery = z.infer<typeof adminLeadsQuerySchema>;
