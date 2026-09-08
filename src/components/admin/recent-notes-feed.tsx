import type { DashboardRecentNote } from "@/lib/services/dashboard";

interface RecentNotesFeedProps {
  notes: DashboardRecentNote[];
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

export function RecentNotesFeed({ notes }: RecentNotesFeedProps) {
  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white">
        <p className="text-xs font-semibold text-slate-600">No internal notes yet</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Notes added to patient inquiries by team members will be highlighted here.
        </p>
      </div>
    );
  }

  return (
    <ul role="list" className="space-y-3">
      {notes.map((note) => {
        const authorName = note.author.name || note.author.email;

        return (
          <li
            key={note.id}
            className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-colors hover:border-slate-300 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {note.lead.name}
                  </span>
                  <span className="text-[11px] text-slate-400">({note.lead.email})</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  By <strong className="font-medium text-slate-700">{authorName}</strong>
                </p>
              </div>

              <time
                dateTime={note.createdAt}
                className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap"
              >
                {formatDate(note.createdAt)}
              </time>
            </div>

            {/* Note Content with Line Clamp for Layout Safety */}
            <div className="rounded-md border border-slate-200/80 bg-slate-50/80 p-2.5">
              <p className="text-xs text-slate-800 whitespace-pre-wrap line-clamp-3 leading-relaxed font-sans">
                {note.content}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
