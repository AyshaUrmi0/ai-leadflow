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
  serviceInterest: z.enum(serviceInterestOptions).optional(),
  message: optionalTrimmedString(1000),
  consentGiven: z.literal(true),
});

export type LeadInput = z.infer<typeof leadSchema>;
