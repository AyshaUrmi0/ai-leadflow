"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { StatusBadge } from "@/components/admin/status-badge";
import { LeadDetailsDrawer, type SerializedLead } from "@/components/admin/lead-details-drawer";
import { updateLeadStatusAction } from "@/app/admin/leads/actions";
import { leadStatusValues } from "@/lib/validations/lead";

interface LeadsTableProps {
  leads: SerializedLead[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  currentStatus?: string;
  currentSearch?: string;
}

const statusTabOptions = [
  { label: "All", value: "" },
  { label: "New", value: "NEW" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Closed Lost", value: "CLOSED_LOST" },
];

export function LeadsTable({
  leads,
  pagination,
  currentStatus = "",
  currentSearch = "",
}: LeadsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(currentSearch);
  const [selectedLead, setSelectedLead] = useState<SerializedLead | null>(null);
  const [isPending, startTransition] = useTransition();
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateQueryParams = (newSearch: string, newStatus: string, page = 1) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch) {
      params.set("search", newSearch);
    } else {
      params.delete("search");
    }
    if (newStatus) {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    updateQueryParams(val, currentStatus, 1);
  };

  const handleStatusTabChange = (statusValue: string) => {
    updateQueryParams(searchValue, statusValue, 1);
  };

  const handlePageChange = (newPage: number) => {
    updateQueryParams(searchValue, currentStatus, newPage);
  };

  const handleInlineStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setUpdateError(null);
    startTransition(async () => {
      const res = await updateLeadStatusAction(leadId, newStatus);
      if (!res.success) {
        setUpdateError(res.error || "Failed to update status.");
      }
    });
  };

  const hasActiveFilters = Boolean(currentSearch || currentStatus);
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const totalLeads = pagination?.total ?? leads.length;

  return (
    <div>
      {/* Search and Filters Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-medium">
          {statusTabOptions.map((tab) => {
            const isActive = currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusTabChange(tab.value)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-64">
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search name or email..."
            className="w-full min-h-10 rounded-md border border-slate-300 bg-white px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-teal-700"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
      </div>

      {updateError && (
        <div
          className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-800 border border-red-200"
          role="alert"
        >
          {updateError}
        </div>
      )}

      {/* Table Container */}
      {leads.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            {hasActiveFilters ? "No matching leads found" : "No leads captured yet"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {hasActiveFilters
              ? "Try adjusting your search query or status filter."
              : "Submissions from the landing page form will appear here."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                updateQueryParams("", "", 1);
              }}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Name & Email
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Service Interest
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Consent
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-950">{lead.name}</div>
                      <div className="text-slate-500">{lead.email}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {lead.serviceInterest || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={lead.status} />
                        <select
                          aria-label={`Change status for ${lead.name}`}
                          disabled={isPending}
                          value={lead.status}
                          onChange={(e) =>
                            handleInlineStatusChange(lead.id, e.target.value as LeadStatus)
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:opacity-50"
                        >
                          {leadStatusValues.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {lead.consentGiven ? (
                        <span className="inline-flex items-center text-teal-700 font-medium">
                          ✓ Agreed
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-teal-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 flex items-center justify-between px-2 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900">{totalLeads === 0 ? 0 : (currentPage - 1) * (pagination?.limit || 10) + 1}</span> to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(currentPage * (pagination?.limit || 10), totalLeads)}
              </span>{" "}
              of <span className="font-semibold text-slate-900">{totalLeads}</span> leads
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lead Details Drawer */}
      <LeadDetailsDrawer
        lead={selectedLead ? leads.find((l) => l.id === selectedLead.id) || selectedLead : null}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
