import type { DashboardRecentActivity } from "@/lib/services/dashboard";

interface RecentActivityFeedProps {
  activities: DashboardRecentActivity[];
}

function getActivityMeta(activity: DashboardRecentActivity): {
  title: string;
  badgeClass: string;
  description: string | null;
} {
  const details = activity.details || {};

  switch (activity.type) {
    case "STATUS_CHANGE": {
      const from = typeof details.from === "string" ? details.from.replace("_", " ") : null;
      const to = typeof details.to === "string" ? details.to.replace("_", " ") : null;
      return {
        title: "Lead Status Updated",
        badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
        description: from && to ? `Changed from ${from} to ${to}` : "Status transitioned",
      };
    }
    case "NOTE_ADDED":
      return {
        title: "Internal Note Added",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        description: "New clinical/administrative note logged",
      };
    case "TASK_CREATED": {
      const title = typeof details.title === "string" ? details.title : null;
      return {
        title: "Follow-up Task Created",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
        description: title ? `Task: "${title}"` : "New task assigned",
      };
    }
    case "TASK_STATUS_CHANGE": {
      const title = typeof details.title === "string" ? details.title : "Task";
      const to = typeof details.to === "string" ? details.to.replace("_", " ") : null;
      return {
        title: "Task Status Updated",
        badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
        description: to ? `"${title}" moved to ${to}` : `Updated "${title}"`,
      };
    }
    default:
      return {
        title: "System Event",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
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
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white">
        <p className="text-xs font-semibold text-slate-600">No recent activity</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Lead updates, notes, and task actions will appear here in chronological order.
        </p>
      </div>
    );
  }

  return (
    <ul role="list" className="space-y-3">
      {activities.map((activity) => {
        const meta = getActivityMeta(activity);
        const actorName = activity.actor?.name || activity.actor?.email || "System";

        return (
          <li
            key={activity.id}
            className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-colors hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                  >
                    {meta.title}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {activity.lead.name}
                  </span>
                </div>

                {meta.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {meta.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                  <span>
                    By <strong className="font-medium text-slate-700">{actorName}</strong>
                  </span>
                  <span>•</span>
                  <span>{activity.lead.email}</span>
                </div>
              </div>

              <time
                dateTime={activity.createdAt}
                className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap"
              >
                {formatDate(activity.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
