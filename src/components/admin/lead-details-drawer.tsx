"use client";

import { useEffect, useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { StatusBadge } from "@/components/admin/status-badge";
import { updateLeadStatusAction } from "@/app/admin/leads/actions";
import { leadStatusValues } from "@/lib/validations/lead";
import { AddNoteForm } from "@/components/admin/add-note-form";
import { ActivityTimeline } from "@/components/admin/activity-timeline";
import { AddTaskForm } from "@/components/admin/add-task-form";
import { TaskList } from "@/components/admin/task-list";

export interface SerializedLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  serviceInterest: string | null;
  message: string | null;
  consentGiven: boolean;
  status: LeadStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface LeadDetailsDrawerProps {
  lead: SerializedLead | null;
  onClose: () => void;
}

export function LeadDetailsDrawer({ lead, onClose }: LeadDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"info" | "timeline" | "tasks">("info");
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (lead) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lead, onClose]);

  if (!lead) return null;

  const handleTabChange = (tab: "info" | "timeline" | "tasks") => {
    setError(null);
    setActiveTab(tab);
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    setError(null);
    startTransition(async () => {
      const res = await updateLeadStatusAction(lead.id, newStatus);
      if (!res.success) {
        setError(res.error || "Failed to update status.");
      } else {
        setRefreshKey((prev) => prev + 1);
      }
    });
  };

  const handleNoteAdded = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleTaskCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleTaskUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={onClose}
    >
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className="w-screen max-w-md sm:max-w-lg bg-white p-6 shadow-xl sm:p-8 flex flex-col justify-between h-full overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-teal-800 uppercase">
                  Lead Details
                </p>
                <h2 id="drawer-title" className="mt-1 text-2xl font-semibold text-slate-950">
                  {lead.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-teal-700"
                aria-label="Close drawer"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-4 border-b border-slate-200" role="tablist" aria-label="Lead details tabs">
              <div className="-mb-px flex gap-6">
                <button
                  type="button"
                  role="tab"
                  id="tab-info"
                  aria-selected={activeTab === "info"}
                  aria-controls="panel-info"
                  onClick={() => handleTabChange("info")}
                  className={`pb-2.5 text-xs font-semibold tracking-wide transition-colors ${
                    activeTab === "info"
                      ? "border-b-2 border-teal-700 text-teal-800"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Lead Information
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-timeline"
                  aria-selected={activeTab === "timeline"}
                  aria-controls="panel-timeline"
                  onClick={() => handleTabChange("timeline")}
                  className={`pb-2.5 text-xs font-semibold tracking-wide transition-colors ${
                    activeTab === "timeline"
                      ? "border-b-2 border-teal-700 text-teal-800"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Notes &amp; Activity
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-tasks"
                  aria-selected={activeTab === "tasks"}
                  aria-controls="panel-tasks"
                  onClick={() => handleTabChange("tasks")}
                  className={`pb-2.5 text-xs font-semibold tracking-wide transition-colors ${
                    activeTab === "tasks"
                      ? "border-b-2 border-teal-700 text-teal-800"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tasks &amp; Follow-ups
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                {error}
              </div>
            )}

            {/* Tab Panel 1: Lead Information */}
            {activeTab === "info" && (
              <div
                id="panel-info"
                role="tabpanel"
                aria-labelledby="tab-info"
                className="mt-6 space-y-5 text-sm text-slate-700"
              >
                {/* Status Update */}
                <div>
                  <label htmlFor="drawer-status" className="block text-xs font-semibold text-slate-500 uppercase">
                    Status
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <StatusBadge status={lead.status} />
                    <select
                      id="drawer-status"
                      disabled={isPending}
                      value={lead.status}
                      onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:opacity-50"
                    >
                      {leadStatusValues.map((st) => (
                        <option key={st} value={st}>
                          Change to {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Contact</p>
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="font-medium text-slate-900">Email:</span>{" "}
                      <a href={`mailto:${lead.email}`} className="text-teal-700 hover:underline">
                        {lead.email}
                      </a>
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Phone:</span>{" "}
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-teal-700 hover:underline">
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Consultation Details */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Consultation Request</p>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="font-medium text-slate-900">Service Interest:</span>{" "}
                      {lead.serviceInterest || <span className="text-slate-400 italic">None specified</span>}
                    </p>
                    <div>
                      <span className="font-medium text-slate-900 block mb-1">Message:</span>
                      {lead.message ? (
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                          {lead.message}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No message provided.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="border-t border-slate-100 pt-4 text-xs space-y-1 text-slate-500">
                  <p>
                    <span className="font-medium text-slate-700">Consent Given:</span>{" "}
                    {lead.consentGiven ? "Yes (Explicit opt-in)" : "No"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Source:</span> {lead.source}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Submitted:</span>{" "}
                    {new Date(lead.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Last Updated:</span>{" "}
                    {new Date(lead.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Tab Panel 2: Notes & Activity */}
            {activeTab === "timeline" && (
              <div
                id="panel-timeline"
                role="tabpanel"
                aria-labelledby="tab-timeline"
                className="mt-6 space-y-6"
              >
                {/* Form to add note */}
                <AddNoteForm leadId={lead.id} onNoteAdded={handleNoteAdded} />

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase mb-4">
                    Activity &amp; Notes Timeline
                  </h3>
                  <div className="max-h-[50vh] overflow-y-auto pr-1">
                    <ActivityTimeline leadId={lead.id} refreshKey={refreshKey} />
                  </div>
                </div>
              </div>
            )}

            {/* Tab Panel 3: Tasks & Follow-ups */}
            {activeTab === "tasks" && (
              <div
                id="panel-tasks"
                role="tabpanel"
                aria-labelledby="tab-tasks"
                className="mt-6 space-y-6"
              >
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 uppercase mb-3">
                    Add Follow-up Task
                  </h3>
                  <AddTaskForm
                    key={`add-task-${lead.id}`}
                    leadId={lead.id}
                    onTaskCreated={handleTaskCreated}
                  />
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase mb-4">
                    Follow-up Tasks
                  </h3>
                  <div className="max-h-[40vh] overflow-y-auto pr-1">
                    <TaskList
                      key={`task-list-${lead.id}-${refreshKey}`}
                      leadId={lead.id}
                      refreshKey={refreshKey}
                      onTaskUpdated={handleTaskUpdated}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
