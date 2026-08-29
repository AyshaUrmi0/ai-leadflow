import { prisma } from "@/lib/prisma";
import type { LeadActivityType, Prisma } from "@prisma/client";

export interface RecordActivityParams {
  leadId: string;
  actorId?: string | null;
  type: LeadActivityType;
  details?: Prisma.InputJsonValue;
}

/**
 * Reusable helper for recording an activity log entry.
 * Accepts an optional Prisma transaction client, defaulting to global `prisma`.
 */
export async function recordActivityLog(
  params: RecordActivityParams,
  tx: Prisma.TransactionClient = prisma
) {
  const { leadId, actorId = null, type, details } = params;

  return await tx.leadActivityLog.create({
    data: {
      leadId,
      actorId,
      type,
      details,
    },
  });
}

/**
 * Retrieves the activity timeline for a given lead, ordered newest first.
 * Omits sensitive data such as `passwordHash`.
 */
export async function getLeadActivityTimeline(leadId: string) {
  return await prisma.leadActivityLog.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      leadId: true,
      actorId: true,
      type: true,
      details: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
