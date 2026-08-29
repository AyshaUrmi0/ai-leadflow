"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import { getLeadTimelineAction } from "@/app/admin/leads/actions";

export interface SerializedActor {
  id: string;
  name: string | null;
  email: string;
}

export interface SerializedActivityLog {
  id: string;
  leadId: string;
  actorId: string | null;
  type: "STATUS_CHANGE" | "NOTE_ADDED";
  details: { from?: string; to?: string; noteId?: string; content?: string } | null;
  createdAt: string;
  actor?: SerializedActor | null;
}

export interface SerializedLeadNote {
  id: string;
  leadId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author?: SerializedActor | null;
}

export interface ActivityTimelineProps {
  leadId?: string;
  activities?: SerializedActivityLog[];
  notes?: SerializedLeadNote[];
  isLoading?: boolean;
  error?: string | null;
  refreshKey?: number;
}

interface MergedTimelineEntry {
  id: string;
  type: "STATUS_CHANGE" | "NOTE_ADDED";
  createdAt: Date;
  actorName: string;
  actorEmail?: string | null;
  statusFrom?: string;
  statusTo?: string;
  noteContent?: string;
}

export function ActivityTimeline({
  leadId,
  activities: initialActivities,
  notes: initialNotes,
  isLoading: externalLoading,
  error: externalError,
  refreshKey = 0,
}: ActivityTimelineProps) {
  const [fetchedActivities, setFetchedActivities] = useState<SerializedActivityLog[]>([]);
  const [fetchedNotes, setFetchedNotes] = useState<SerializedLeadNote[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!leadId) return;

    let isMounted = true;

    startTransition(async () => {
      setInternalError(null);
      try {
        const res = await getLeadTimelineAction(leadId);
        if (!isMounted) return;

        if (res.success) {
          setFetchedActivities(res.activities || []);
          setFetchedNotes(res.notes || []);
        } else {
          setInternalError(res.error || "Failed to load activity timeline.");
        }
      } catch {
        if (isMounted) {
          setInternalError("An error occurred while loading activity timeline.");
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [leadId, refreshKey]);

  const activities = initialActivities ?? fetchedActivities;
  const notes = initialNotes ?? fetchedNotes;
  const isLoading = externalLoading ?? isPending;
  const error = externalError ?? internalError;

  const timelineEntries = useMemo<MergedTimelineEntry[]>(() => {
    const entries: MergedTimelineEntry[] = [];
    const notesById = new Map<string, SerializedLeadNote>();

    notes.forEach((note) => {
      notesById.set(note.id, note);
    });

    activities.forEach((act) => {
      if (act.type === "STATUS_CHANGE") {
        const details = act.details || {};
        entries.push({
          id: act.id,
          type: "STATUS_CHANGE",
          createdAt: new Date(act.createdAt),
          actorName: act.actor?.name || act.actor?.email || "System Admin",
          actorEmail: act.actor?.email,
          statusFrom: details.from || "NEW",
          statusTo: details.to || "NEW",
        });
      } else if (act.type === "NOTE_ADDED") {
        const noteId = act.details?.noteId;
        const matchedNote = noteId ? notesById.get(noteId) : null;
        const noteContent = matchedNote?.content || act.details?.content || "";
        const noteAuthor = matchedNote?.author || act.actor;

        entries.push({
          id: act.id,
          type: "NOTE_ADDED",
          createdAt: new Date(act.createdAt),
          actorName: noteAuthor?.name || noteAuthor?.email || "Team Member",
          actorEmail: noteAuthor?.email,
          noteContent,
        });

        if (matchedNote) {
          notesById.delete(matchedNote.id);
        }
      }
    });

    notesById.forEach((note) => {
      entries.push({
        id: `note-${note.id}`,
        type: "NOTE_ADDED",
        createdAt: new Date(note.createdAt),
        actorName: note.author?.name || note.author?.email || "Team Member",
        actorEmail: note.author?.email,
        noteContent: note.content,
      });
    });

    return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [activities, notes]);

  if (isLoading) {
    return (
      <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <svg
          className="h-4 w-4 animate-spin text-teal-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading activity timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-3 text-xs border border-red-200 text-red-700">
        {error}
      </div>
    );
  }

  if (timelineEntries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
        No activity or notes recorded yet for this lead.
      </div>
    );
  }

  return (
    <div className="flow-root" aria-label="Lead activity timeline">
      <ul role="list" className="-mb-8">
        {timelineEntries.map((item, index) => {
          const isLast = index === timelineEntries.length - 1;
          return (
            <li key={item.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  {item.type === "STATUS_CHANGE" ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 ring-8 ring-white text-teal-800">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                        />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-8 ring-white text-slate-700">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                        />
                      </svg>
                    </span>
                  )}

                  <div className="min-w-0 flex-1 pt-1.5">
                    <div className="text-xs text-slate-600 flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">
                        {item.type === "STATUS_CHANGE" ? (
                          <>
                            Status changed from{" "}
                            <span className="font-semibold text-slate-800">{item.statusFrom}</span>{" "}
                            to{" "}
                            <span className="font-semibold text-teal-800">{item.statusTo}</span>
                          </>
                        ) : (
                          <>
                            Internal Note by{" "}
                            <span className="font-semibold text-slate-900">{item.actorName}</span>
                          </>
                        )}
                      </p>
                      <time
                        dateTime={item.createdAt.toISOString()}
                        className="text-[11px] text-slate-400 whitespace-nowrap"
                      >
                        {item.createdAt.toLocaleString()}
                      </time>
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {item.type === "STATUS_CHANGE" ? (
                        <p>
                          Updated by <span className="font-medium text-slate-700">{item.actorName}</span>
                          {item.actorEmail && item.actorEmail !== item.actorName && ` (${item.actorEmail})`}
                        </p>
                      ) : (
                        item.noteContent && (
                          <div className="mt-1.5 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
                            {item.noteContent}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
