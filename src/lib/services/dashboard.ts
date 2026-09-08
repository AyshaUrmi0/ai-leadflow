import { prisma } from "@/lib/prisma";
import { LeadStatus, TaskStatus, type LeadActivityType } from "@prisma/client";

export interface LeadMetrics {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  closedLost: number;
}

export interface TaskMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export interface DashboardRecentActivity {
  id: string;
  type: LeadActivityType;
  details: Record<string, unknown> | null;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    email: string;
  };
  actor: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface DashboardRecentNote {
  id: string;
  content: string;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    email: string;
  };
  author: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface DashboardRecentTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface DashboardMetricsData {
  leads: LeadMetrics;
  tasks: TaskMetrics;
  recentActivity: DashboardRecentActivity[];
  recentNotes: DashboardRecentNote[];
  recentTasks: DashboardRecentTask[];
}

/**
 * Safely parses Prisma JSON activity details into a plain serializable object.
 */
function serializeActivityDetails(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(details)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Retrieves aggregated dashboard metrics and recent feeds.
 *
 * Query execution strategy:
 * - Executes all independent aggregations and recent item queries concurrently via Promise.all.
 * - Leverages PostgreSQL/Prisma database-level groupBy and count rather than loading rows into memory.
 * - Calculates overdue tasks directly in the database (dueDate < now AND status IN [PENDING, IN_PROGRESS]).
 * - Uses explicit select clauses excluding sensitive user data (e.g. passwordHash).
 * - Converts dates to ISO strings to guarantee serializability across Server Component boundaries.
 * - Handles zero-data states gracefully by defaulting missing groups to 0 and empty feeds to [].
 */
export async function getDashboardMetrics(): Promise<DashboardMetricsData> {
  const now = new Date();

  const [
    leadStatusGroups,
    taskStatusGroups,
    overdueTasksCount,
    recentActivityRaw,
    recentNotesRaw,
    recentTasksRaw,
  ] = await Promise.all([
    // 1. Group leads by status for aggregated counts
    prisma.lead.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),

    // 2. Group tasks by status for aggregated counts
    prisma.leadTask.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),

    // 3. Count overdue tasks (dueDate has passed and task is still active)
    prisma.leadTask.count({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
        },
      },
    }),

    // 4. Fetch 5 most recent activity log entries with safe relation selections
    prisma.leadActivityLog.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        details: true,
        createdAt: true,
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

    // 5. Fetch 5 most recent internal notes with safe relation selections
    prisma.leadNote.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

    // 6. Fetch 5 most recent follow-up tasks with safe relation selections
    prisma.leadTask.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        createdAt: true,
        lead: {
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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  // Aggregate lead counts with defaults for zero-data state
  const leadCounts: Record<LeadStatus, number> = {
    [LeadStatus.NEW]: 0,
    [LeadStatus.CONTACTED]: 0,
    [LeadStatus.QUALIFIED]: 0,
    [LeadStatus.CLOSED_LOST]: 0,
  };

  for (const group of leadStatusGroups) {
    if (group.status in leadCounts) {
      leadCounts[group.status] = group._count._all;
    }
  }

  const leads: LeadMetrics = {
    total: Object.values(leadCounts).reduce((acc, count) => acc + count, 0),
    new: leadCounts[LeadStatus.NEW],
    contacted: leadCounts[LeadStatus.CONTACTED],
    qualified: leadCounts[LeadStatus.QUALIFIED],
    closedLost: leadCounts[LeadStatus.CLOSED_LOST],
  };

  // Aggregate task counts with defaults for zero-data state
  const taskCounts: Record<TaskStatus, number> = {
    [TaskStatus.PENDING]: 0,
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.COMPLETED]: 0,
    [TaskStatus.CANCELLED]: 0,
  };

  for (const group of taskStatusGroups) {
    if (group.status in taskCounts) {
      taskCounts[group.status] = group._count._all;
    }
  }

  const tasks: TaskMetrics = {
    total: Object.values(taskCounts).reduce((acc, count) => acc + count, 0),
    pending: taskCounts[TaskStatus.PENDING],
    inProgress: taskCounts[TaskStatus.IN_PROGRESS],
    completed: taskCounts[TaskStatus.COMPLETED],
    cancelled: taskCounts[TaskStatus.CANCELLED],
    overdue: overdueTasksCount,
  };

  // Format and serialize recent activities
  const recentActivity: DashboardRecentActivity[] = recentActivityRaw.map((act) => ({
    id: act.id,
    type: act.type,
    details: serializeActivityDetails(act.details),
    createdAt: act.createdAt.toISOString(),
    lead: {
      id: act.lead.id,
      name: act.lead.name,
      email: act.lead.email,
    },
    actor: act.actor
      ? {
          id: act.actor.id,
          name: act.actor.name,
          email: act.actor.email,
        }
      : null,
  }));

  // Format and serialize recent internal notes
  const recentNotes: DashboardRecentNote[] = recentNotesRaw.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    lead: {
      id: note.lead.id,
      name: note.lead.name,
      email: note.lead.email,
    },
    author: {
      id: note.author.id,
      name: note.author.name,
      email: note.author.email,
    },
  }));

  // Format and serialize recent follow-up tasks
  const recentTasks: DashboardRecentTask[] = recentTasksRaw.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    lead: {
      id: task.lead.id,
      name: task.lead.name,
      email: task.lead.email,
    },
    assignedTo: task.assignedTo
      ? {
          id: task.assignedTo.id,
          name: task.assignedTo.name,
          email: task.assignedTo.email,
        }
      : null,
    creator: {
      id: task.creator.id,
      name: task.creator.name,
      email: task.creator.email,
    },
  }));

  return {
    leads,
    tasks,
    recentActivity,
    recentNotes,
    recentTasks,
  };
}
