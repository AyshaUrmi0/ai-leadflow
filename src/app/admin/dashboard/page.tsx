import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/dal";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { AdminNav } from "@/components/admin/admin-nav";
import { RecentActivityFeed } from "@/components/admin/recent-activity-feed";
import { RecentNotesFeed } from "@/components/admin/recent-notes-feed";
import { RecentTasksFeed } from "@/components/admin/recent-tasks-feed";
import { TaskDistributionChart } from "@/components/admin/task-distribution-chart";

export const metadata: Metadata = {
  title: "Lead Intelligence Dashboard | Nova Dental Admin",
  description: "Overview of clinic leads, follow-up tasks, and recent patient activity.",
};

export default async function AdminDashboardPage() {
  // Data Access Layer security boundary check
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/login?callbackUrl=/admin/dashboard");
  }

  // Database domain service aggregation
  const metrics = await getDashboardMetrics();

  // Derived intelligence stats
  const totalLeads = metrics.leads.total;
  const safeTotal = totalLeads || 1;
  const closedLostPct = Math.round((metrics.leads.closedLost / safeTotal) * 100);
  const qualificationRate =
    totalLeads > 0 ? Math.round((metrics.leads.qualified / totalLeads) * 100) : 0;
  const activeTasksCount = metrics.tasks.pending + metrics.tasks.inProgress;
  const taskCompletionRate =
    metrics.tasks.total > 0
      ? Math.round((metrics.tasks.completed / metrics.tasks.total) * 100)
      : 0;
  const adminDisplayName = admin.name || admin.email.split("@")[0];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900">
      <AdminNav adminEmail={admin.email} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* TOP HERO BANNER: Welcome & Operational Status */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/80 to-teal-50/30 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100/80 px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse" />
                  {metrics.leads.new > 0
                    ? `Live · ${metrics.leads.new} awaiting triage`
                    : "Clinic LeadFlow Active"}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Welcome back, {adminDisplayName}
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Real-time overview of clinic patient inquiries, follow-up tasks, and team activity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/leads"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 transition-all"
              >
                <span>Manage Patient Leads</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION 1: KEY PERFORMANCE INDICATORS (KPIs) */}
        <section aria-labelledby="kpi-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="kpi-heading" className="text-base font-semibold text-slate-950">
              Pipeline Snapshot
            </h2>
            <Link
              href="/admin/leads"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
            >
              View detailed database →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Leads */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Total Consultations</span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  All Time
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-bold tracking-tight text-slate-950">{totalLeads}</span>
                <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">Inbound consultation requests logged</p>
            </div>

            {/* In Review / New */}
            <Link
              href="/admin/leads?status=NEW"
              className="group rounded-xl border border-teal-200/80 bg-teal-50/40 p-5 shadow-2xs hover:border-teal-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-teal-800">New Inquiries</span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    metrics.leads.new > 0
                      ? "bg-teal-200/80 text-teal-900"
                      : "bg-teal-100/50 text-teal-700"
                  }`}
                >
                  {metrics.leads.new > 0 ? "Awaiting Outreach" : "Clear"}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-bold tracking-tight text-teal-950">
                  {metrics.leads.new}
                </span>
                <div className="rounded-lg bg-teal-100 p-2 text-teal-800 group-hover:scale-105 transition-transform">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-teal-700/80">Pending initial contact by team</p>
            </Link>

            {/* Qualified Consultations */}
            <Link
              href="/admin/leads?status=QUALIFIED"
              className="group rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-800">Qualified Leads</span>
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                  {qualificationRate}% Conversion
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-bold tracking-tight text-emerald-950">
                  {metrics.leads.qualified}
                </span>
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800 group-hover:scale-105 transition-transform">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-emerald-700/80">Confirmed consultation candidates</p>
            </Link>

            {/* Overdue / Active Tasks */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Action Required</span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    metrics.tasks.overdue > 0
                      ? "bg-rose-100 text-rose-800 animate-pulse"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {metrics.tasks.overdue > 0
                    ? `${metrics.tasks.overdue} Overdue`
                    : "All on Track"}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span
                  className={`text-3xl font-bold tracking-tight ${
                    metrics.tasks.overdue > 0 ? "text-rose-950" : "text-slate-950"
                  }`}
                >
                  {metrics.tasks.overdue}
                </span>
                <div
                  className={`rounded-lg p-2 ${
                    metrics.tasks.overdue > 0
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {activeTasksCount} active tasks remaining in queue
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: CONVERSION FUNNEL & TASK WORKLOAD IN 2 PANELS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Panel A: Lead Funnel Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                Lead Conversion Pipeline
              </h3>
              <p className="text-xs text-slate-500">
                Stage progression and conversion performance
              </p>
            </div>

            {/* Horizontal stage distribution bar */}
            {totalLeads > 0 ? (
              <div className="space-y-3">
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                  <div
                    style={{ width: `${(metrics.leads.new / totalLeads) * 100}%` }}
                    className="bg-teal-500 transition-all"
                    title={`New: ${metrics.leads.new}`}
                  />
                  <div
                    style={{ width: `${(metrics.leads.contacted / totalLeads) * 100}%` }}
                    className="bg-amber-400 transition-all"
                    title={`Contacted: ${metrics.leads.contacted}`}
                  />
                  <div
                    style={{ width: `${(metrics.leads.qualified / totalLeads) * 100}%` }}
                    className="bg-emerald-500 transition-all"
                    title={`Qualified: ${metrics.leads.qualified}`}
                  />
                  <div
                    style={{ width: `${(metrics.leads.closedLost / totalLeads) * 100}%` }}
                    className="bg-slate-300 transition-all"
                    title={`Closed Lost: ${metrics.leads.closedLost}`}
                  />
                </div>

                {/* Clean Stage Legend */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                    <span>New ({metrics.leads.new})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Contacted ({metrics.leads.contacted})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Qualified ({metrics.leads.qualified})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Closed ({metrics.leads.closedLost})</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Conversion Health Metrics */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Qualified Rate
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{qualificationRate}%</div>
                <div className="text-[11px] text-emerald-700 font-medium">Inquiry to qualification</div>
              </div>

              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3.5">
                <div className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">
                  Active Care Pipeline
                </div>
                <div className="mt-1 text-2xl font-bold text-teal-950">
                  {metrics.leads.new + metrics.leads.contacted}
                </div>
                <div className="text-[11px] text-teal-700">Currently in discussion</div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Closed / Inactive
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-700">{closedLostPct}%</div>
                <div className="text-[11px] text-slate-500">{metrics.leads.closedLost} archived leads</div>
              </div>
            </div>
          </div>

          {/* Panel B: Task Workload Breakdown & Chart */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                  Task Management & Follow-ups
                </h3>
                <p className="text-xs text-slate-500">
                  Workload distribution and patient follow-up progress
                </p>
              </div>
              <span className="inline-flex items-center rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 border border-teal-200">
                {taskCompletionRate}% Resolved
              </span>
            </div>

            {/* Interactive Task Distribution Chart */}
            <TaskDistributionChart tasks={metrics.tasks} />
          </div>
        </div>

        {/* SECTION 3: RECENT ACTIVITY & FEEDS GRID (BENTO BOX LAYOUT) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main 2-Column Area (Activity & Tasks) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Feed 1: Recent Activity */}
            <section
              aria-labelledby="recent-activity-heading"
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-teal-50 p-1.5 text-teal-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2
                      id="recent-activity-heading"
                      className="text-sm font-semibold tracking-tight text-slate-900"
                    >
                      Recent Activity
                    </h2>
                    <p className="text-[11px] text-slate-500">Live chronological lead event feed</p>
                  </div>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  Last 5 Events
                </span>
              </div>
              <RecentActivityFeed activities={metrics.recentActivity} />
            </section>

            {/* Feed 2: Recent Follow-Up Tasks */}
            <section
              aria-labelledby="recent-tasks-heading"
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2
                      id="recent-tasks-heading"
                      className="text-sm font-semibold tracking-tight text-slate-900"
                    >
                      Recent Follow-up Tasks
                    </h2>
                    <p className="text-[11px] text-slate-500">Active clinician and team reminders</p>
                  </div>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  Last 5 Tasks
                </span>
              </div>
              <RecentTasksFeed tasks={metrics.recentTasks} />
            </section>
          </div>

          {/* Sidebar Column (Notes & Quick Shortcuts) */}
          <div className="space-y-8">
            {/* Feed 3: Clinical Notes */}
            <section
              aria-labelledby="recent-notes-heading"
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-amber-50 p-1.5 text-amber-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2
                      id="recent-notes-heading"
                      className="text-sm font-semibold tracking-tight text-slate-900"
                    >
                      Recent Patient Notes
                    </h2>
                    <p className="text-[11px] text-slate-500">Internal consultations & logs</p>
                  </div>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  Last 5
                </span>
              </div>
              <RecentNotesFeed notes={metrics.recentNotes} />
            </section>

            {/* Quick Navigation & Clinical Triage Hub Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-600/20 text-teal-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                    Quick Filters &amp; Triage
                  </h3>
                  <p className="text-[11px] text-slate-500">Fast 1-click status &amp; specialty shortcuts</p>
                </div>
              </div>

              {/* Instant Search Bar */}
              <form action="/admin/leads" method="GET" className="relative">
                <input
                  type="text"
                  name="search"
                  placeholder="Quick search patient, phone, or service..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-14 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 transition-all"
                />
                <svg
                  className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 rounded-lg bg-teal-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xs hover:bg-teal-700 active:scale-95 transition-all"
                >
                  Find ↵
                </button>
              </form>

              {/* Status Segment Shortcuts (Compact 2x2 Grid) */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  Filter by Status
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/admin/leads?status=NEW"
                    className="group flex items-center justify-between rounded-xl border border-teal-200/80 bg-teal-50/50 p-2.5 hover:bg-teal-100/70 hover:border-teal-300 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-teal-950">New</span>
                    </div>
                    <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-xs font-bold text-teal-900">
                      {metrics.leads.new}
                    </span>
                  </Link>

                  <Link
                    href="/admin/leads?status=QUALIFIED"
                    className="group flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 hover:bg-emerald-100/70 hover:border-emerald-300 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-950">Qualified</span>
                    </div>
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-900">
                      {metrics.leads.qualified}
                    </span>
                  </Link>

                  <Link
                    href="/admin/leads?status=CONTACTED"
                    className="group flex items-center justify-between rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 hover:bg-amber-100/70 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-amber-950">Contacted</span>
                    </div>
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                      {metrics.leads.contacted}
                    </span>
                  </Link>

                  <Link
                    href="/admin/leads?status=CLOSED_LOST"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 hover:bg-slate-100 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-slate-950">Closed</span>
                    </div>
                    <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-xs font-bold text-slate-800">
                      {metrics.leads.closedLost}
                    </span>
                  </Link>
                </div>
              </div>

              {/* Treatment Specialty Quick Filter Chips */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  <span>Popular Treatments</span>
                  <span className="text-[10px] lowercase text-slate-400">1-click filter</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href="/admin/leads?search=Implants"
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition-all"
                  >
                    <span>🦷</span>
                    <span>Implants</span>
                  </Link>
                  <Link
                    href="/admin/leads?search=Whitening"
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition-all"
                  >
                    <span>✨</span>
                    <span>Whitening</span>
                  </Link>
                  <Link
                    href="/admin/leads?search=Invisalign"
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition-all"
                  >
                    <span>📐</span>
                    <span>Invisalign</span>
                  </Link>
                  <Link
                    href="/admin/leads?search=Checkup"
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition-all"
                  >
                    <span>🩺</span>
                    <span>Checkup</span>
                  </Link>
                  <Link
                    href="/admin/leads?search=Emergency"
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/60 px-2.5 py-1 text-xs font-medium text-rose-800 hover:border-rose-300 hover:bg-rose-100 transition-all"
                  >
                    <span>🚨</span>
                    <span>Emergency</span>
                  </Link>
                </div>
              </div>

              {/* Overdue Task Shortcut Banner if any */}
              {metrics.tasks.overdue > 0 && (
                <a
                  href="#tasks-section"
                  className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-900 hover:bg-rose-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-semibold">{metrics.tasks.overdue} Overdue Follow-ups</span>
                  </div>
                  <span className="font-medium text-rose-700 underline text-[11px]">View Tasks ↓</span>
                </a>
              )}

              {/* Bottom Full Database CTA */}
              <div className="pt-2 border-t border-slate-100">
                <Link
                  href="/admin/leads"
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-900 transition-all"
                >
                  <span>Browse All Leads Database ({totalLeads})</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
