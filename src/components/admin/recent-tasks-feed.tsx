import type { DashboardRecentTask } from "@/lib/services/dashboard";
import type { TaskStatus } from "@prisma/client";

interface RecentTasksFeedProps {
  tasks: DashboardRecentTask[];
}

function getTaskStatusStyle(status: TaskStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        className: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

function isTaskOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate) return false;
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  return new Date(dueDate).getTime() < Date.now();
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function RecentTasksFeed({ tasks }: RecentTasksFeedProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white">
        <p className="text-xs font-semibold text-slate-600">No follow-up tasks yet</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Scheduled patient consultations and team follow-up reminders will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul role="list" className="space-y-3">
      {tasks.map((task) => {
        const statusMeta = getTaskStatusStyle(task.status);
        const overdue = isTaskOverdue(task.dueDate, task.status);
        const assignee = task.assignedTo?.name || task.assignedTo?.email || "Unassigned";

        return (
          <li
            key={task.id}
            className={`rounded-lg border bg-white p-3.5 shadow-xs transition-colors hover:border-slate-300 ${
              overdue ? "border-rose-300/80 bg-rose-50/20" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>

                  {overdue && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                      <svg
                        className="h-3 w-3 text-rose-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Overdue
                    </span>
                  )}

                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                    {task.title}
                  </h4>
                </div>

                {task.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 flex-wrap pt-0.5">
                  <span>
                    Lead: <strong className="font-medium text-slate-700">{task.lead.name}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Assignee: <strong className="font-medium text-slate-700">{assignee}</strong>
                  </span>
                  {task.dueDate && (
                    <>
                      <span>•</span>
                      <span className={overdue ? "font-medium text-rose-700" : ""}>
                        Due: {formatDate(task.dueDate)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
