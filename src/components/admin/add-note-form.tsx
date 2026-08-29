"use client";

import { useState, useTransition } from "react";
import { addLeadNoteAction } from "@/app/admin/leads/actions";

export interface AddNoteFormProps {
  leadId: string;
  onNoteAdded?: () => void;
}

const MAX_CHAR_COUNT = 2000;

export function AddNoteForm({ leadId, onNoteAdded }: AddNoteFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmedLength = content.trim().length;
  const isContentEmpty = trimmedLength === 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isContentEmpty || isPending) return;

    setError(null);

    startTransition(async () => {
      const res = await addLeadNoteAction(leadId, content);
      if (res.success) {
        setContent("");
        if (onNoteAdded) {
          onNoteAdded();
        }
      } else {
        setError(res.error || "Failed to add note.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor={`note-content-${leadId}`}
            className="block text-xs font-semibold tracking-wider text-slate-700 uppercase"
          >
            Add Internal Note
          </label>
          <span
            id={`note-count-${leadId}`}
            className={`text-xs ${
              content.length > MAX_CHAR_COUNT
                ? "font-semibold text-red-600"
                : "text-slate-500"
            }`}
          >
            {content.length} / {MAX_CHAR_COUNT}
          </span>
        </div>
        <div className="mt-1.5">
          <textarea
            id={`note-content-${leadId}`}
            name="content"
            rows={3}
            maxLength={MAX_CHAR_COUNT}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isPending}
            placeholder="Type internal notes about this lead (only visible to team members)..."
            aria-invalid={Boolean(error)}
            aria-describedby={`note-count-${leadId} ${error ? `note-error-${leadId}` : ""}`}
            className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:bg-slate-50 disabled:opacity-60 resize-y"
          />
        </div>
      </div>

      {error && (
        <div
          id={`note-error-${leadId}`}
          aria-live="polite"
          className="rounded-md bg-red-50 p-2.5 text-xs border border-red-200 text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isContentEmpty || isPending || content.length > MAX_CHAR_COUNT}
          className="inline-flex items-center justify-center rounded-md bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <svg
                className="mr-1.5 h-3.5 w-3.5 animate-spin text-white"
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
              Saving Note...
            </>
          ) : (
            "Add Note"
          )}
        </button>
      </div>
    </form>
  );
}
