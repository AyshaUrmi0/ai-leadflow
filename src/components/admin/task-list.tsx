"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getLeadTasksAction,
  updateTaskStatusAction,
} from "@/app/admin/leads/actions";

export type TaskStatusType = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface SerializedTaskUser {
  id: string;
  name: string | null;
  email: string;
}

export interface SerializedLeadTask {
  id: string;
  leadId: string;
  creatorId: string;
  assignedToId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatusType;
  createdAt: string;
  updatedAt: string;
  creator?: SerializedTaskUser | null;
  assignedTo?: SerializedTaskUser | null;
}

export interface TaskListProps {
  leadId: string;
  refreshKey?: number;
  onTaskUpdated?: () => void;
}

const taskStatuses: TaskStatusType[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export function TaskList({ leadId, refreshKey = 0, onTaskUpdated }: TaskListProps) {
  const [tasks, setTasks] = useState<SerializedLeadTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    getLeadTasksAction(leadId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.tasks) {
          setTasks(res.tasks);
          setError(null);
        } else {
          setError(res.error || "Failed to load tasks.");
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("An error occurred while loading tasks.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [leadId, refreshKey]);

  const handleStatusChange = (taskId: string, newStatus: TaskStatusType) => {
    setError(null);
    setUpdatingTaskId(taskId);

    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, newStatus);
      setUpdatingTaskId(null);

      if (res.success) {
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId ? { ...t, status: newStatus } : t
          )
        );
        if (onTaskUpdated) {
          onTaskUpdated();
        }
      } else {
        setError(res.error || "Failed to update task status.");
      }
    });
  };

  const getStatusBadgeStyle = (status: TaskStatusType) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "CANCELLED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

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
        Loading follow-up tasks...
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Lead follow-up tasks list">
      {error && (
        <div
          aria-live="polite"
          className="rounded-md bg-red-50 p-2.5 text-xs border border-red-200 text-red-700"
        >
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
          No follow-up tasks yet.
        </div>
      ) : (
        <ul role="list" className="space-y-3">
          {tasks.map((task) => {
            const isTaskUpdating = updatingTaskId === task.id;
            const assigneeName = task.assignedTo
              ? task.assignedTo.name || task.assignedTo.email
              : "Unassigned";
            const creatorName = task.creator
              ? task.creator.name || task.creator.email
              : "Admin";

            return (
              <li
                key={task.id}
                className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-colors hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeStyle(
                          task.status
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900 break-words">
                        {task.title}
                      </h4>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 flex-wrap pt-1">
                      <span>
                        <strong className="font-medium text-slate-700">Assignee:</strong>{" "}
                        {assigneeName}
                      </span>
                      <span>
                        <strong className="font-medium text-slate-700">Creator:</strong>{" "}
                        {creatorName}
                      </span>
                      {task.dueDate && (
                        <span>
                          <strong className="font-medium text-slate-700">Due:</strong>{" "}
                          {new Date(task.dueDate).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="shrink-0">
                    <label htmlFor={`task-status-${task.id}`} className="sr-only">
                      Change status for task {task.title}
                    </label>
                    <select
                      id={`task-status-${task.id}`}
                      disabled={isTaskUpdating}
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value as TaskStatusType)
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:opacity-50"
                    >
                      {taskStatuses.map((st) => (
                        <option key={st} value={st}>
                          {st.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
