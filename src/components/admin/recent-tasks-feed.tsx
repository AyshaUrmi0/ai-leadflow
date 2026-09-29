import type { DashboardRecentTask } from "@/lib/services/dashboard";
import type { TaskStatus } from "@prisma/client";

interface RecentTasksFeedProps {
  tasks: DashboardRecentTask[];
}

function getTaskStatusStyle(status: TaskStatus): {
  label: string;
  badgeClass: string;
  borderAccent: string;
  dotClass: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-inset ring-amber-600/20",
        borderAccent: "border-l-amber-500",
        dotClass: "bg-amber-500",
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-inset ring-blue-600/20",
        borderAccent: "border-l-blue-500",
        dotClass: "bg-blue-500",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-inset ring-emerald-600/20",
        borderAccent: "border-l-emerald-500",
        dotClass: "bg-emerald-500",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        borderAccent: "border-l-slate-400",
        dotClass: "bg-slate-400",
      };
    default:
      return {
        label: status,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        borderAccent: "border-l-slate-400",
        dotClass: "bg-slate-400",
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
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white/70">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-700">No follow-up tasks yet</p>
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
        const assigneeName = task.assignedTo?.name || task.assignedTo?.email?.split("@")[0] || "Unassigned";

        return (
          <li
            key={task.id}
            className={`group relative overflow-hidden rounded-xl border border-slate-200/90 border-l-4 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs space-y-2 ${
              overdue
                ? "border-l-rose-500 bg-gradient-to-r from-rose-50/30 to-white"
                : statusMeta.borderAccent
            }`}
          >
            {/* Top Row: Status badge, Title & Overdue Indicator */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusMeta.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                    {statusMeta.label}
                  </span>

                  {overdue && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                      <svg
                        className="h-3 w-3 text-rose-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      Past Due
                    </span>
                  )}

                  <h4 className="text-xs font-bold text-slate-950 truncate">
                    {task.title}
                  </h4>
                </div>

                {task.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal pt-0.5">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Due Date Indicator */}
              {task.dueDate && (
                <div
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                    overdue
                      ? "border-rose-200 bg-rose-50 text-rose-900"
                      : task.status === "COMPLETED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              )}
            </div>

            {/* Bottom Meta Row: Patient & Assignee */}
            <div className="flex items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Patient:</span>
                <strong className="font-semibold text-slate-800">{task.lead.name}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Assignee:</span>
                <strong className="font-medium text-slate-700">{assigneeName}</strong>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
