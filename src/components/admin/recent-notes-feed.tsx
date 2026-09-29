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
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white/70">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-700">No patient notes yet</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Notes added to patient inquiries by team members will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul role="list" className="space-y-3">
      {notes.map((note) => {
        const authorName = note.author.name || note.author.email.split("@")[0];
        const authorInitial = authorName.charAt(0).toUpperCase();

        return (
          <li
            key={note.id}
            className="group relative overflow-hidden rounded-xl border border-slate-200/90 border-l-4 border-l-amber-500 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs space-y-2.5"
          >
            {/* Note Header: Patient Info & Date */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {note.lead.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                    ({note.lead.email})
                  </span>
                </div>
              </div>

              <time
                dateTime={note.createdAt}
                className="shrink-0 text-[11px] font-medium text-slate-400 whitespace-nowrap"
              >
                {formatDate(note.createdAt)}
              </time>
            </div>

            {/* Note Quote Bubble */}
            <div className="relative rounded-xl border border-amber-200/50 bg-amber-50/40 p-3">
              <p className="text-xs text-slate-800 whitespace-pre-wrap line-clamp-3 leading-relaxed font-sans">
                &ldquo;{note.content}&rdquo;
              </p>
            </div>

            {/* Note Author Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 font-bold text-[10px] text-amber-800">
                  {authorInitial}
                </div>
                <span className="font-medium text-slate-700">
                  By <strong className="font-semibold text-slate-900">{authorName}</strong>
                </span>
              </div>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-medium">
                Clinical Note
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
