import type { LeadStatus } from "@prisma/client";

export type LeadTemperature = "COLD" | "WARM" | "HOT";

export interface LeadScoringInput {
  status: LeadStatus;
  phone?: string | null;
  hasPhone?: boolean;
  serviceInterest?: string | null;
  hasServiceInterest?: boolean;
  message?: string | null;
  hasDetailedMessage?: boolean;
  createdAt: Date | string;
  noteCount?: number;
  activeTaskCount?: number;
  completedTaskCount?: number;
}

export interface LeadScoreResult {
  score: number;
  temperature: LeadTemperature;
  reasons: string[];
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Derives the lead temperature classification based on score thresholds:
 * - 0 to 39:   COLD
 * - 40 to 69:  WARM
 * - 70 to 100: HOT
 */
export function getLeadTemperature(score: number): LeadTemperature {
  if (score >= 70) {
    return "HOT";
  }
  if (score >= 40) {
    return "WARM";
  }
  return "COLD";
}

/**
 * Pure, deterministic lead scoring engine.
 *
 * Evaluates a lead based on:
 * 1. Base contact & intent information (phone, service interest, detailed message)
 * 2. Pipeline status (QUALIFIED, CONTACTED, NEW, CLOSED_LOST)
 * 3. Engagement (internal notes, active tasks, completed tasks)
 * 4. Recency (inquiry age relative to `now`)
 *
 * Characteristics:
 * - No network, DB, or environment dependencies.
 * - Always returns a clamped score between 0 and 100.
 * - Suppresses CLOSED_LOST lead scores to a maximum of 10.
 * - Accepts `now` parameter for deterministic, timezone-safe testing.
 */
export function calculateLeadScore(
  input: LeadScoringInput,
  now: Date = new Date()
): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // --- 1. Base Lead Information ---
  const hasPhone =
    input.hasPhone ??
    (typeof input.phone === "string" && input.phone.trim().length > 0);
  if (hasPhone) {
    score += 10;
    reasons.push("Phone number provided");
  }

  const hasServiceInterest =
    input.hasServiceInterest ??
    (typeof input.serviceInterest === "string" &&
      input.serviceInterest.trim().length > 0);
  if (hasServiceInterest) {
    score += 10;
    reasons.push("Service interest specified");
  }

  const hasDetailedMessage =
    input.hasDetailedMessage ??
    (typeof input.message === "string" && input.message.trim().length > 20);
  if (hasDetailedMessage) {
    score += 10;
    reasons.push("Detailed inquiry message provided");
  }

  // --- 2. Lead Status ---
  const isClosedLost = input.status === "CLOSED_LOST";

  switch (input.status) {
    case "QUALIFIED":
      score += 30;
      reasons.push("Lead is qualified");
      break;
    case "CONTACTED":
      score += 20;
      reasons.push("Lead has been contacted");
      break;
    case "NEW":
      score += 10;
      reasons.push("New inbound lead");
      break;
    case "CLOSED_LOST":
      // No standard status points added; closed lost status reason appended below
      break;
  }

  // --- 3. Engagement ---
  const noteCount = Math.max(0, input.noteCount ?? 0);
  if (noteCount > 0) {
    score += 10;
    reasons.push("Internal staff notes logged");
  }

  const activeTaskCount = Math.max(0, input.activeTaskCount ?? 0);
  if (activeTaskCount > 0) {
    score += 10;
    reasons.push("Active follow-up task scheduled");
  }

  const completedTaskCount = Math.max(0, input.completedTaskCount ?? 0);
  if (completedTaskCount > 0) {
    score += 5;
    reasons.push("Follow-up tasks completed");
  }

  // --- 4. Recency ---
  const createdDate =
    input.createdAt instanceof Date
      ? input.createdAt
      : new Date(input.createdAt);

  const isValidDate = !isNaN(createdDate.getTime());

  if (isValidDate) {
    const ageMs = now.getTime() - createdDate.getTime();

    // Only award recency bonus if the lead was created in the past (ageMs >= 0)
    if (ageMs >= 0) {
      if (ageMs <= 48 * MS_PER_HOUR) {
        score += 15;
        reasons.push("Recent inquiry (within last 48 hours)");
      } else if (ageMs <= 7 * MS_PER_DAY) {
        score += 10;
        reasons.push("Inquiry received within the last 7 days");
      } else if (ageMs <= 14 * MS_PER_DAY) {
        score += 5;
        reasons.push("Inquiry received within the last 14 days");
      }
    }
  }

  // --- 5. Clamping & CLOSED_LOST Handling ---
  // Clamp base score to [0, 100]
  score = Math.max(0, Math.min(100, score));

  // If lead is CLOSED_LOST, suppress score to a maximum of 10
  if (isClosedLost) {
    score = Math.min(10, score);
    reasons.push("Lead is marked as closed lost");
  }

  const temperature = getLeadTemperature(score);

  return {
    score,
    temperature,
    reasons,
  };
}
