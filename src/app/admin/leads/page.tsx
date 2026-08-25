import type { Metadata } from "next";
import Link from "next/link";
import { getLeads } from "@/lib/services/lead";
import { LeadsTable } from "@/components/admin/leads-table";
import type { LeadStatus } from "@prisma/client";
import type { SerializedLead } from "@/components/admin/lead-details-drawer";

// TODO: Security Notice - Authentication and authorization boundaries must be added before production deployment.

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
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
              Nova <span className="text-teal-700">Dental</span>
            </Link>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Admin
            </span>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-teal-700 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            ← View Public Site
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        {/* Security / Demo Boundary Warning */}
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <svg className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            Internal Admin Demo Boundary
          </div>
          <p className="mt-1 text-amber-800">
            Note: Database access is restricted server-side. Production deployment requires adding an authentication and session boundary.
          </p>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Lead Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View, search, and manage incoming patient consultation requests.
          </p>
        </div>

        {/* Stat Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Leads</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{countTotal}</p>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 shadow-xs">
            <p className="text-xs font-semibold text-teal-800 uppercase">New</p>
            <p className="mt-1 text-2xl font-semibold text-teal-900">{countNew}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
            <p className="text-xs font-semibold text-amber-800 uppercase">Contacted</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">{countContacted}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
            <p className="text-xs font-semibold text-emerald-800 uppercase">Qualified</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-900">{countQualified}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-4 shadow-xs">
            <p className="text-xs font-semibold text-slate-600 uppercase">Closed Lost</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{countClosedLost}</p>
          </div>
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
