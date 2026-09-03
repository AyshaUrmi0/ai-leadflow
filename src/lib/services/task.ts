import { prisma } from "@/lib/prisma";
import { recordActivityLog } from "@/lib/services/activity";
import type { CreateTaskInput } from "@/lib/validations/task";
import { LeadActivityType, TaskStatus } from "@prisma/client";

export interface CreateLeadTaskParams extends CreateTaskInput {
  creatorId: string;
}

export interface UpdateLeadTaskStatusParams {
  taskId: string;
  status: TaskStatus;
  actorId: string;
}

/**
 * Creates a follow-up task for a lead and logs TASK_CREATED activity within a single transaction.
 */
export async function createLeadTask({
  leadId,
  creatorId,
  title,
  description,
  dueDate,
  assignedToId,
}: CreateLeadTaskParams) {
  const leadExists = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });

  if (!leadExists) {
    throw new Error("Lead not found");
  }

  if (assignedToId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, role: true },
    });

    if (!assignedUser || assignedUser.role !== "ADMIN") {
      throw new Error("Assigned user not found or is not an admin");
    }
  }

  return await prisma.$transaction(async (tx) => {
    const task = await tx.leadTask.create({
      data: {
        leadId,
        creatorId,
        assignedToId: assignedToId || null,
        title,
        description: description || null,
        dueDate: dueDate || null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
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
        actorId: creatorId,
        type: LeadActivityType.TASK_CREATED,
        details: {
          taskId: task.id,
          title: task.title,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          assignedToId: task.assignedToId,
          assignedToEmail: task.assignedTo?.email || null,
        },
      },
      tx
    );

    return task;
  });
}

/**
 * Retrieves follow-up tasks for a specific lead, ordered incomplete first, then due date, then creation date.
 * Excludes sensitive fields like `passwordHash`.
 */
export async function getLeadTasks(leadId: string) {
  return await prisma.leadTask.findMany({
    where: { leadId },
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      leadId: true,
      creatorId: true,
      assignedToId: true,
      title: true,
      description: true,
      dueDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Updates task status and logs TASK_STATUS_CHANGE activity atomically within a transaction.
 * If status is unchanged, avoids unnecessary database updates.
 */
export async function updateLeadTaskStatus({
  taskId,
  status,
  actorId,
}: UpdateLeadTaskStatusParams) {
  const existingTask = await prisma.leadTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      leadId: true,
      title: true,
      status: true,
    },
  });

  if (!existingTask) {
    throw new Error("Task not found");
  }

  if (existingTask.status === status) {
    return await prisma.leadTask.findUnique({
      where: { id: taskId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  return await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.leadTask.update({
      where: { id: taskId },
      data: { status },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await recordActivityLog(
      {
        leadId: existingTask.leadId,
        actorId,
        type: LeadActivityType.TASK_STATUS_CHANGE,
        details: {
          taskId: existingTask.id,
          title: existingTask.title,
          from: existingTask.status,
          to: status,
        },
      },
      tx
    );

    return updatedTask;
  });
}
