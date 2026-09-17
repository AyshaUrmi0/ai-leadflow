import type { LeadIntelligence } from "@/lib/validations/intelligence";
import type { LeadTemperature } from "@/lib/services/scoring";

export interface SafeNoteContext {
  content: string;
  createdAt?: string | Date;
}

export interface SafeTaskContext {
  title: string;
  description?: string | null;
  status: string;
  dueDate?: string | Date | null;
}

/**
 * Strict boundary of data exposed to the AI model.
 *
 * Contains only non-sensitive, operational lead context.
 * Strictly excludes:
 * - Passwords, hashes, credentials
 * - Session secrets, JWTs, cookies
 * - Personal contact identifiers (email, direct phone)
 * - Internal database IDs and full User records
 */
export interface LeadIntelligenceInput {
  /** Optional reference for internal server logging only; excluded from prompt */
  leadId?: string;
  firstName?: string | null;
  serviceInterest?: string | null;
  status: string;
  /** Authoritative deterministic score from scoring.ts (0-100) */
  score: number;
  /** Authoritative deterministic temperature from scoring.ts */
  temperature: LeadTemperature;
  scoreReasons?: string[];
  message?: string | null;
  notes?: SafeNoteContext[];
  tasks?: SafeTaskContext[];
}

export type AIErrorCode =
  | "MISSING_API_KEY"
  | "CONFIG_ERROR"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "EMPTY_RESPONSE";

export type AIIntelligenceResult =
  | {
      success: true;
      data: LeadIntelligence;
    }
  | {
      success: false;
      error: string;
      code: AIErrorCode;
    };
