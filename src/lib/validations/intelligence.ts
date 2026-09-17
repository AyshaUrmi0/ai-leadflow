import { z } from "zod";

export const recommendedTimingValues = [
  "IMMEDIATE",
  "WITHIN_24_HOURS",
  "WITHIN_3_DAYS",
  "NO_ACTION_NEEDED",
] as const;

export type RecommendedTiming = (typeof recommendedTimingValues)[number];

export const urgencyValues = ["LOW", "MEDIUM", "HIGH"] as const;

export type LeadUrgency = (typeof urgencyValues)[number];

export const suggestedNextActionSchema = z
  .object({
    title: z.string().trim().min(5).max(100),
    description: z.string().trim().max(250),
    recommendedTiming: z.enum(recommendedTimingValues),
    suggestedDueDateDaysFromNow: z
      .number()
      .int()
      .min(0)
      .max(14)
      .nullable(),
  })
  .strict();

export type SuggestedNextAction = z.infer<typeof suggestedNextActionSchema>;

export const leadIntelligenceSchema = z
  .object({
    summary: z.string().trim().min(10).max(350),
    keyObservations: z
      .array(z.string().trim().min(1).max(120))
      .max(3),
    suggestedNextAction: suggestedNextActionSchema,
    urgency: z.enum(urgencyValues),
  })
  .strict();

export type LeadIntelligence = z.infer<typeof leadIntelligenceSchema>;
