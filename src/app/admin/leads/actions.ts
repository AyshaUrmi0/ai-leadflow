"use server";

import { updateLeadStatusSchema } from "@/lib/validations/lead";
import { createNoteSchema } from "@/lib/validations/note";
import { updateLeadStatus, getLeadById } from "@/lib/services/lead";
import { createLeadNote, getLeadNotes } from "@/lib/services/note";
import { getLeadActivityTimeline } from "@/lib/services/activity";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function updateLeadStatusAction(id: string, status: string) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
    };
  }

  const validationResult = updateLeadStatusSchema.safeParse({ id, status });

  if (!validationResult.success) {
    return {
      success: false,
      error: "Invalid status or ID.",
    };
  }

  const { id: leadId, status: validStatus } = validationResult.data;

  try {
    const existingLead = await getLeadById(leadId);
    if (!existingLead) {
      return {
        success: false,
        error: "Lead not found.",
      };
    }

    await updateLeadStatus(leadId, validStatus, session.userId);
    revalidatePath("/admin/leads");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to update lead status:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating status.",
    };
  }
}

export async function addLeadNoteAction(leadId: string, content: string) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
    };
  }

  const validationResult = createNoteSchema.safeParse({ leadId, content });

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0]?.message || "Invalid note data.",
    };
  }

  const { leadId: validLeadId, content: validContent } = validationResult.data;

  try {
    const note = await createLeadNote({
      leadId: validLeadId,
      content: validContent,
      authorId: session.userId,
    });

    revalidatePath("/admin/leads");

    return {
      success: true,
      note: {
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        createdAt: note.createdAt,
        author: note.author,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Lead not found") {
      return {
        success: false,
        error: "Lead not found.",
      };
    }

    console.error("Failed to add lead note:", error);
    return {
      success: false,
      error: "An unexpected error occurred while adding the note.",
    };
  }
}

export async function getLeadTimelineAction(leadId: string) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
      activities: [],
      notes: [],
    };
  }

  if (!leadId) {
    return {
      success: false,
      error: "Invalid lead ID.",
      activities: [],
      notes: [],
    };
  }

  try {
    const existingLead = await getLeadById(leadId);
    if (!existingLead) {
      return {
        success: false,
        error: "Lead not found.",
        activities: [],
        notes: [],
      };
    }

    const [activities, notes] = await Promise.all([
      getLeadActivityTimeline(leadId),
      getLeadNotes(leadId),
    ]);

    return {
      success: true,
      activities: JSON.parse(JSON.stringify(activities)),
      notes: JSON.parse(JSON.stringify(notes)),
    };
  } catch (error) {
    console.error("Failed to fetch lead timeline:", error);
    return {
      success: false,
      error: "An unexpected error occurred while loading activity timeline.",
      activities: [],
      notes: [],
    };
  }
}
