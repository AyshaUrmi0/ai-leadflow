import { prisma } from "@/lib/prisma";
import { calculateLeadScore, type LeadScoreResult } from "@/lib/services/scoring";
import { generateLeadIntelligence } from "@/lib/ai/provider";
import type { LeadIntelligenceInput, AIIntelligenceResult } from "@/lib/ai/types";
import { TaskStatus } from "@prisma/client";

/**
 * Retrieves lead data and relation counts to compute a deterministic lead score.
 *
 * Query execution strategy:
 * - Executes the lead query and related count queries concurrently via Promise.all.
 * - Counts active tasks (PENDING, IN_PROGRESS) and completed tasks (COMPLETED) at the database level.
 * - Avoids loading full note or task objects into memory.
 * - Passes normalized inputs into the pure `calculateLeadScore` engine.
 */
export async function getLeadScoreData(leadId: string): Promise<LeadScoreResult | null> {
  const [lead, noteCount, activeTaskCount, completedTaskCount] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        status: true,
        phone: true,
        serviceInterest: true,
        message: true,
        createdAt: true,
      },
    }),
    prisma.leadNote.count({
      where: { leadId },
    }),
    prisma.leadTask.count({
      where: {
        leadId,
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
      },
    }),
    prisma.leadTask.count({
      where: {
        leadId,
        status: TaskStatus.COMPLETED,
      },
    }),
  ]);

  if (!lead) {
    return null;
  }

  return calculateLeadScore({
    status: lead.status,
    phone: lead.phone,
    serviceInterest: lead.serviceInterest,
    message: lead.message,
    createdAt: lead.createdAt,
    noteCount,
    activeTaskCount,
    completedTaskCount,
  });
}

/**
 * Assembles a safe, non-sensitive lead intelligence input context for the AI advisory layer.
 *
 * Data boundary guarantees:
 * - Strictly excludes personal contact info (email, phone).
 * - Strictly excludes credentials, password hashes, auth secrets, and user IDs.
 * - Only extracts first name from lead name.
 * - Employs authoritative deterministic scoring from `getLeadScoreData`.
 * - Sanitizes notes and tasks to textual context only.
 */
export async function assembleLeadIntelligenceContext(
  leadId: string
): Promise<LeadIntelligenceInput | null> {
  const [lead, scoreResult, notes, tasks] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        serviceInterest: true,
        status: true,
        message: true,
      },
    }),
    getLeadScoreData(leadId),
    prisma.leadNote.findMany({
      where: { leadId },
      select: {
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.leadTask.findMany({
      where: { leadId },
      select: {
        title: true,
        description: true,
        status: true,
        dueDate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!lead || !scoreResult) {
    return null;
  }

  // Extract first name safely from full name (e.g. "Jane Doe" -> "Jane")
  const firstName = lead.name ? lead.name.trim().split(/\s+/)[0] : null;

  return {
    leadId: lead.id,
    firstName: firstName || null,
    serviceInterest: lead.serviceInterest,
    status: lead.status,
    score: scoreResult.score,
    temperature: scoreResult.temperature,
    scoreReasons: scoreResult.reasons,
    message: lead.message,
    notes: notes.map((n) => ({
      content: n.content,
      createdAt: n.createdAt,
    })),
    tasks: tasks.map((t) => ({
      title: t.title,
      description: t.description,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
    })),
  };
}

/**
 * Generates advisory AI intelligence for a given lead.
 *
 * Operational rules:
 * - Deterministic score remains authoritative.
 * - On-demand only (never called automatically or via cron).
 * - Maps missing API key to a clean, user-friendly configuration message.
 */
export async function getLeadAIIntelligence(
  leadId: string
): Promise<AIIntelligenceResult> {
  const input = await assembleLeadIntelligenceContext(leadId);

  if (!input) {
    return {
      success: false,
      error: "Lead not found.",
      code: "CONFIG_ERROR",
    };
  }

  const result = await generateLeadIntelligence(input);

  if (!result.success && result.code === "MISSING_API_KEY") {
    return {
      success: false,
      error: "AI insights are not configured yet.",
      code: "MISSING_API_KEY",
    };
  }

  return result;
}
