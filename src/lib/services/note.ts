import { prisma } from "@/lib/prisma";
import { recordActivityLog } from "@/lib/services/activity";
import type { CreateNoteInput } from "@/lib/validations/note";
import { LeadActivityType } from "@prisma/client";

export interface CreateLeadNoteParams extends CreateNoteInput {
  authorId: string;
}

/**
 * Creates a internal note for a lead and logs the NOTE_ADDED activity atomically within a transaction.
 */
export async function createLeadNote({ leadId, content, authorId }: CreateLeadNoteParams) {
  const leadExists = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });

  if (!leadExists) {
    throw new Error("Lead not found");
  }

  return await prisma.$transaction(async (tx) => {
    const note = await tx.leadNote.create({
      data: {
        leadId,
        authorId,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await recordActivityLog(
      {
        leadId,
        actorId: authorId,
        type: LeadActivityType.NOTE_ADDED,
        details: {
          noteId: note.id,
        },
      },
      tx
    );

    return note;
  });
}

/**
 * Retrieves internal notes for a lead, ordered newest first.
 * Omits sensitive user data such as `passwordHash`.
 */
export async function getLeadNotes(leadId: string) {
  return await prisma.leadNote.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      leadId: true,
      authorId: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
