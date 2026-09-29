import type { DashboardRecentActivity } from "@/lib/services/dashboard";
import type { ReactNode } from "react";

interface RecentActivityFeedProps {
  activities: DashboardRecentActivity[];
}

interface ActivityMeta {
  title: string;
  badgeClass: string;
  iconBg: string;
  icon: ReactNode;
  description: string | null;
}

function getActivityMeta(activity: DashboardRecentActivity): ActivityMeta {
  const details = activity.details || {};

  switch (activity.type) {
    case "STATUS_CHANGE": {
      const from = typeof details.from === "string" ? details.from.replace("_", " ") : null;
      const to = typeof details.to === "string" ? details.to.replace("_", " ") : null;
      return {
        title: "Status Changed",
        badgeClass: "bg-teal-50 text-teal-800 border-teal-200 ring-1 ring-inset ring-teal-600/20",
        iconBg: "bg-teal-100 text-teal-700",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        ),
        description: from && to ? `Lead progressed from ${from} to ${to}` : "Status transitioned",
      };
    }
    case "NOTE_ADDED":
      return {
        title: "Clinical Note Added",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-inset ring-amber-600/20",
        iconBg: "bg-amber-100 text-amber-700",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        ),
        description: "New clinical inquiry or consultation note logged",
      };
    case "TASK_CREATED": {
      const title = typeof details.title === "string" ? details.title : null;
      return {
        title: "Task Assigned",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-inset ring-blue-600/20",
        iconBg: "bg-blue-100 text-blue-700",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        description: title ? `Follow-up created: "${title}"` : "New patient task created",
      };
    }
    case "TASK_STATUS_CHANGE": {
      const title = typeof details.title === "string" ? details.title : "Task";
      const to = typeof details.to === "string" ? details.to.replace("_", " ") : null;
      return {
        title: "Task Status Updated",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-inset ring-emerald-600/20",
        iconBg: "bg-emerald-100 text-emerald-700",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        description: to ? `"${title}" moved to ${to}` : `Updated status for "${title}"`,
      };
    }
    default:
      return {
        title: "System Event",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        iconBg: "bg-slate-100 text-slate-600",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        description: null,
      };
  }
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

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white/70">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-700">No recent activity</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Lead updates, notes, and task actions will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <ul role="list" className="space-y-3">
      {activities.map((activity) => {
        const meta = getActivityMeta(activity);
        const actorName = activity.actor?.name || activity.actor?.email?.split("@")[0] || "Staff";

        return (
          <li
            key={activity.id}
            className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
          >
            <div className="flex items-start gap-3.5">
              {/* Type Emblem Icon */}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${meta.iconBg}`}
              >
                {meta.icon}
              </div>

              {/* Main Content Area */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                    >
                      {meta.title}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {activity.lead.name}
                    </span>
                  </div>

                  <time
                    dateTime={activity.createdAt}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 whitespace-nowrap"
                  >
                    <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(activity.createdAt)}
                  </time>
                </div>

                {meta.description && (
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {meta.description}
                  </p>
                )}

                {/* Sub-meta details bar */}
                <div className="flex items-center gap-2.5 text-[11px] text-slate-500 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 border border-slate-100 font-medium text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    {actorName}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="truncate text-slate-400" title={activity.lead.email}>
                    {activity.lead.email}
                  </span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
