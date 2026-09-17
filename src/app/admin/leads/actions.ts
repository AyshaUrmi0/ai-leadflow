"use server";

import { updateLeadStatusSchema } from "@/lib/validations/lead";
import { createNoteSchema } from "@/lib/validations/note";
import { createTaskSchema, updateTaskStatusSchema } from "@/lib/validations/task";
import { updateLeadStatus, getLeadById } from "@/lib/services/lead";
import { createLeadNote, getLeadNotes } from "@/lib/services/note";
import { getLeadActivityTimeline } from "@/lib/services/activity";
import { createLeadTask, getLeadTasks, updateLeadTaskStatus } from "@/lib/services/task";
import { getAdminUsers } from "@/lib/services/user";
import { getLeadScoreData, getLeadAIIntelligence } from "@/lib/services/intelligence";
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

export async function createLeadTaskAction(
  leadId: string,
  title: string,
  description?: string,
  dueDate?: string,
  assignedToId?: string
) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
    };
  }

  const validationResult = createTaskSchema.safeParse({
    leadId,
    title,
    description,
    dueDate,
    assignedToId,
  });

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0]?.message || "Invalid task data.",
    };
  }

  const {
    leadId: validLeadId,
    title: validTitle,
    description: validDescription,
    dueDate: validDueDate,
    assignedToId: validAssignedToId,
  } = validationResult.data;

  try {
    const task = await createLeadTask({
      leadId: validLeadId,
      title: validTitle,
      description: validDescription,
      dueDate: validDueDate,
      assignedToId: validAssignedToId,
      creatorId: session.userId,
    });

    revalidatePath("/admin/leads");

    return {
      success: true,
      task: JSON.parse(JSON.stringify(task)),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Lead not found") {
        return {
          success: false,
          error: "Lead not found.",
        };
      }
      if (error.message === "Assigned user not found or is not an admin") {
        return {
          success: false,
          error: "Assigned user not found or is not an admin.",
        };
      }
    }

    console.error("Failed to create lead task:", error);
    return {
      success: false,
      error: "An unexpected error occurred while creating the task.",
    };
  }
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
    };
  }

  const validationResult = updateTaskStatusSchema.safeParse({ taskId, status });

  if (!validationResult.success) {
    return {
      success: false,
      error: "Invalid task status or ID.",
    };
  }

  const { taskId: validTaskId, status: validStatus } = validationResult.data;

  try {
    const task = await updateLeadTaskStatus({
      taskId: validTaskId,
      status: validStatus,
      actorId: session.userId,
    });

    revalidatePath("/admin/leads");

    return {
      success: true,
      task: JSON.parse(JSON.stringify(task)),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return {
        success: false,
        error: "Task not found.",
      };
    }

    console.error("Failed to update task status:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating task status.",
    };
  }
}

export async function getLeadTasksAction(leadId: string) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
      tasks: [],
    };
  }

  if (!leadId || typeof leadId !== "string" || leadId.trim().length === 0) {
    return {
      success: false,
      error: "Invalid lead ID.",
      tasks: [],
    };
  }

  try {
    const tasks = await getLeadTasks(leadId.trim());

    return {
      success: true,
      tasks: JSON.parse(JSON.stringify(tasks)),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Lead not found") {
      return {
        success: false,
        error: "Lead not found.",
        tasks: [],
      };
    }

    console.error("Failed to fetch lead tasks:", error);
    return {
      success: false,
      error: "An unexpected error occurred while loading tasks.",
      tasks: [],
    };
  }
}

export async function getAdminUsersAction() {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
      users: [],
    };
  }

  try {
    const users = await getAdminUsers();

    return {
      success: true,
      users: JSON.parse(JSON.stringify(users)),
    };
  } catch (error) {
    console.error("Failed to fetch admin users:", error);
    return {
      success: false,
      error: "An unexpected error occurred while loading admin users.",
      users: [],
    };
  }
}

export async function getLeadScoreAction(leadId: string) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
      scoreResult: null,
    };
  }

  if (!leadId || typeof leadId !== "string" || leadId.trim().length === 0) {
    return {
      success: false,
      error: "Invalid lead ID.",
      scoreResult: null,
    };
  }

  try {
    const scoreResult = await getLeadScoreData(leadId.trim());
    if (!scoreResult) {
      return {
        success: false,
        error: "Lead not found.",
        scoreResult: null,
      };
    }

    return {
      success: true,
      scoreResult,
    };
  } catch (error) {
    console.error("Failed to fetch lead score:", error);
    return {
      success: false,
      error: "An unexpected error occurred while calculating lead score.",
      scoreResult: null,
    };
  }
}

export async function generateAIIntelligenceAction(leadId: string) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    return {
      success: false as const,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
    };
  }

  if (!leadId || typeof leadId !== "string" || leadId.trim().length === 0) {
    return {
      success: false as const,
      error: "Invalid lead ID.",
    };
  }

  try {
    const result = await getLeadAIIntelligence(leadId.trim());
    return result;
  } catch (error) {
    console.error("Failed to generate AI intelligence:", error);
    return {
      success: false as const,
      error: "An unexpected error occurred while generating AI intelligence.",
    };
  }
}
