import "server-only";

import OpenAI from "openai";
import { leadIntelligenceSchema } from "@/lib/validations/intelligence";
import { buildLeadIntelligencePrompt } from "./prompts";
import type { LeadIntelligenceInput, AIIntelligenceResult } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Generates structured AI lead intelligence for a dental patient lead.
 *
 * Guarantees:
 * - Server-only execution (`import "server-only"`).
 * - Safe error handling: Never leaks API keys, headers, or internal tracebacks.
 * - Strict schema validation via Zod boundary.
 * - Deterministic scoring is treated as authoritative and never modified.
 * - On-demand execution only (never runs on batch or cron).
 */
export async function generateLeadIntelligence(
  input: LeadIntelligenceInput
): Promise<AIIntelligenceResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      error: "AI service is not configured. Missing API key.",
      code: "MISSING_API_KEY",
    };
  }

  try {
    const openai = new OpenAI({
      apiKey,
      timeout: DEFAULT_TIMEOUT_MS,
    });

    const { systemPrompt, userPrompt } = buildLeadIntelligencePrompt(input);

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 800,
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent || rawContent.trim().length === 0) {
      return {
        success: false,
        error: "AI provider returned an empty response.",
        code: "EMPTY_RESPONSE",
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      return {
        success: false,
        error: "Failed to parse AI provider response as JSON.",
        code: "PARSE_ERROR",
      };
    }

    const validation = leadIntelligenceSchema.safeParse(parsedJson);

    if (!validation.success) {
      const issueMessage =
        validation.error.issues[0]?.message || "Invalid output structure.";
      return {
        success: false,
        error: `AI output failed validation: ${issueMessage}`,
        code: "VALIDATION_ERROR",
      };
    }

    return {
      success: true,
      data: validation.data,
    };
  } catch (err: unknown) {
    // Sanitize and map provider errors without leaking credentials or sensitive debug info
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401 || err.status === 403) {
        return {
          success: false,
          error: "AI service authentication failed.",
          code: "PROVIDER_ERROR",
        };
      }
      if (err.status === 429) {
        return {
          success: false,
          error: "AI service rate limit reached. Please try again shortly.",
          code: "PROVIDER_ERROR",
        };
      }
      return {
        success: false,
        error: "AI service provider returned an error.",
        code: "PROVIDER_ERROR",
      };
    }

    if (err instanceof Error) {
      if (err.name === "AbortError" || err.message.toLowerCase().includes("timeout")) {
        return {
          success: false,
          error: "AI request timed out. Please try again.",
          code: "TIMEOUT",
        };
      }
    }

    return {
      success: false,
      error: "An unexpected error occurred while generating intelligence.",
      code: "PROVIDER_ERROR",
    };
  }
}
