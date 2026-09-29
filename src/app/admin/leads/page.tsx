import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/dal";
import { getLeads } from "@/lib/services/lead";
import { LeadsTable } from "@/components/admin/leads-table";
import { AdminNav } from "@/components/admin/admin-nav";
import type { LeadStatus } from "@prisma/client";
import type { SerializedLead } from "@/components/admin/lead-details-drawer";

export const metadata: Metadata = {
  title: "Lead Management | Nova Dental Admin",
  description: "Internal lead management dashboard for Nova Dental consultation requests.",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

const validStatuses: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED_LOST"];

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  // Data Access Layer security boundary check
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/login?callbackUrl=/admin/leads");
  }

  const resolvedSearchParams = await searchParams;
  const rawStatus = resolvedSearchParams.status;
  const search = resolvedSearchParams.search || "";
  const page = parseInt(resolvedSearchParams.page || "1", 10) || 1;
  const limit = parseInt(resolvedSearchParams.limit || "10", 10) || 10;

  const statusFilter = validStatuses.includes(rawStatus as LeadStatus)
    ? (rawStatus as LeadStatus)
    : undefined;

  // Server-side database query via Lead service with pagination
  const result = await getLeads({
    status: statusFilter,
    search: search,
    page: page,
    limit: limit,
  });

  // Calculate summary counts across all leads for stat cards
  const allLeadsResult = statusFilter || search || page > 1 ? await getLeads({ limit: 1000 }) : result;
  const countTotal = allLeadsResult.total;
  const countNew = allLeadsResult.leads.filter((l) => l.status === "NEW").length;
  const countContacted = allLeadsResult.leads.filter((l) => l.status === "CONTACTED").length;
  const countQualified = allLeadsResult.leads.filter((l) => l.status === "QUALIFIED").length;
  const countClosedLost = allLeadsResult.leads.filter((l) => l.status === "CLOSED_LOST").length;

  const serializedLeads: SerializedLead[] = result.leads.map((lead) => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminNav adminEmail={admin.email} />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Lead Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View, search, and manage incoming patient consultation requests.
          </p>
        </div>

        {/* Interactive Stat Quick Filter Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Link
            href={`/admin/leads${search ? `?search=${encodeURIComponent(search)}` : ""}`}
            className={`group rounded-xl border p-4 shadow-2xs transition-all hover:shadow-xs ${
              !statusFilter
                ? "border-slate-400 bg-white ring-2 ring-slate-400/20 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</p>
              {!statusFilter && (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              )}
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{countTotal}</p>
            <p className="mt-1 text-[11px] text-slate-400">All registered records</p>
          </Link>

          <Link
            href={`/admin/leads?status=NEW${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`group rounded-xl border p-4 shadow-2xs transition-all hover:shadow-xs ${
              statusFilter === "NEW"
                ? "border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20 shadow-xs"
                : "border-teal-200/80 bg-teal-50/40 hover:border-teal-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider">New</p>
              {statusFilter === "NEW" ? (
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
              ) : countNew > 0 ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-teal-900">{countNew}</p>
            <p className="mt-1 text-[11px] text-teal-700/70">Needs initial outreach</p>
          </Link>

          <Link
            href={`/admin/leads?status=CONTACTED${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`group rounded-xl border p-4 shadow-2xs transition-all hover:shadow-xs ${
              statusFilter === "CONTACTED"
                ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs"
                : "border-amber-200/80 bg-amber-50/40 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Contacted</p>
              {statusFilter === "CONTACTED" && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
              )}
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-amber-900">{countContacted}</p>
            <p className="mt-1 text-[11px] text-amber-700/70">Follow-up in progress</p>
          </Link>

          <Link
            href={`/admin/leads?status=QUALIFIED${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`group rounded-xl border p-4 shadow-2xs transition-all hover:shadow-xs ${
              statusFilter === "QUALIFIED"
                ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs"
                : "border-emerald-200/80 bg-emerald-50/40 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Qualified</p>
              {statusFilter === "QUALIFIED" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              )}
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-900">{countQualified}</p>
            <p className="mt-1 text-[11px] text-emerald-700/70">Ready for scheduling</p>
          </Link>

          <Link
            href={`/admin/leads?status=CLOSED_LOST${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`group rounded-xl border p-4 shadow-2xs transition-all hover:shadow-xs ${
              statusFilter === "CLOSED_LOST"
                ? "border-slate-400 bg-slate-100 ring-2 ring-slate-400/20 shadow-xs"
                : "border-slate-200 bg-slate-100/60 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Closed Lost</p>
              {statusFilter === "CLOSED_LOST" && (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              )}
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-800">{countClosedLost}</p>
            <p className="mt-1 text-[11px] text-slate-500">Archived / declined</p>
          </Link>
        </div>

        {/* Leads Table & Filters */}
        <LeadsTable
          leads={serializedLeads}
          pagination={{
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          }}
          currentStatus={statusFilter || ""}
          currentSearch={search}
        />
      </main>
    </div>
  );
}
