"use client";

import { useEffect, useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { StatusBadge } from "@/components/admin/status-badge";
import { updateLeadStatusAction } from "@/app/admin/leads/actions";
import { leadStatusValues } from "@/lib/validations/lead";

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

  const handleStatusChange = (newStatus: LeadStatus) => {
    setError(null);
    startTransition(async () => {
      const res = await updateLeadStatusAction(lead.id, newStatus);
      if (!res.success) {
        setError(res.error || "Failed to update status.");
      }
    });
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
          className="w-screen max-w-md bg-white p-6 shadow-xl sm:p-8 flex flex-col justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
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

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                {error}
              </div>
            )}

            {/* Content Details */}
            <div className="mt-6 space-y-5 text-sm text-slate-700">
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
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 flex justify-end">
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
