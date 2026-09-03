"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createLeadTaskAction,
  getAdminUsersAction,
} from "@/app/admin/leads/actions";

export interface AdminUserOption {
  id: string;
  name: string | null;
  email: string;
}

export interface AddTaskFormProps {
  leadId: string;
  onTaskCreated?: () => void;
}

const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;

export function AddTaskForm({ leadId, onTaskCreated }: AddTaskFormProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    getAdminUsersAction().then((res) => {
      if (!isMounted) return;
      if (res.success && res.users) {
        setAdminUsers(res.users);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const isTitleEmpty = title.trim().length === 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isTitleEmpty || isPending) return;

    setError(null);

    let normalizedDueDate: string | undefined = undefined;
    if (dueDate.trim().length > 0) {
      const parsedDate = new Date(dueDate);
      if (!isNaN(parsedDate.getTime())) {
        normalizedDueDate = parsedDate.toISOString();
      } else {
        setError("Please enter a valid date.");
        return;
      }
    }

    startTransition(async () => {
      const res = await createLeadTaskAction(
        leadId,
        title.trim(),
        description.trim().length > 0 ? description.trim() : undefined,
        normalizedDueDate,
        assignedToId.trim().length > 0 ? assignedToId.trim() : undefined
      );

      if (res.success) {
        setTitle("");
        setDescription("");
        setDueDate("");
        setAssignedToId("");
        if (onTaskCreated) {
          onTaskCreated();
        }
      } else {
        setError(res.error || "Failed to create task.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title Field */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor={`task-title-${leadId}`}
            className="block text-xs font-semibold tracking-wider text-slate-700 uppercase"
          >
            Task Title <span className="text-red-500">*</span>
          </label>
          <span
            id={`task-title-count-${leadId}`}
            className={`text-xs ${
              title.length > MAX_TITLE_LENGTH
                ? "font-semibold text-red-600"
                : "text-slate-500"
            }`}
          >
            {title.length} / {MAX_TITLE_LENGTH}
          </span>
        </div>
        <div className="mt-1.5">
          <input
            id={`task-title-${leadId}`}
            type="text"
            maxLength={MAX_TITLE_LENGTH}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
            placeholder="e.g. Follow up regarding consultation details"
            aria-invalid={Boolean(error && isTitleEmpty)}
            aria-describedby={`task-title-count-${leadId}`}
            className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:bg-slate-50 disabled:opacity-60"
          />
        </div>
      </div>

      {/* Description Field */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor={`task-desc-${leadId}`}
            className="block text-xs font-semibold tracking-wider text-slate-700 uppercase"
          >
            Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <span
            id={`task-desc-count-${leadId}`}
            className={`text-xs ${
              description.length > MAX_DESC_LENGTH
                ? "font-semibold text-red-600"
                : "text-slate-500"
            }`}
          >
            {description.length} / {MAX_DESC_LENGTH}
          </span>
        </div>
        <div className="mt-1.5">
          <textarea
            id={`task-desc-${leadId}`}
            rows={2}
            maxLength={MAX_DESC_LENGTH}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            placeholder="Add additional details or context for this follow-up..."
            aria-describedby={`task-desc-count-${leadId}`}
            className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:bg-slate-50 disabled:opacity-60 resize-y"
          />
        </div>
      </div>

      {/* Due Date & Assignee Inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Due Date */}
        <div>
          <label
            htmlFor={`task-duedate-${leadId}`}
            className="block text-xs font-semibold tracking-wider text-slate-700 uppercase"
          >
            Due Date <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="mt-1.5">
            <input
              id={`task-duedate-${leadId}`}
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:bg-slate-50 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label
            htmlFor={`task-assignee-${leadId}`}
            className="block text-xs font-semibold tracking-wider text-slate-700 uppercase"
          >
            Assignee <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="mt-1.5">
            <select
              id={`task-assignee-${leadId}`}
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:bg-slate-50 disabled:opacity-60"
            >
              <option value="">Unassigned</option>
              {adminUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ? `${user.name} (${user.email})` : user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message Display */}
      {error && (
        <div
          id={`task-error-${leadId}`}
          aria-live="polite"
          className="rounded-md bg-red-50 p-2.5 text-xs border border-red-200 text-red-700"
        >
          {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isTitleEmpty || isPending || title.length > MAX_TITLE_LENGTH}
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
              Creating Task...
            </>
          ) : (
            "Create Task"
          )}
        </button>
      </div>
    </form>
  );
}
