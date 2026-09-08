import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/dal";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { AdminNav } from "@/components/admin/admin-nav";
import { DashboardStatCard } from "@/components/admin/dashboard-stat-card";
import { RecentActivityFeed } from "@/components/admin/recent-activity-feed";
import { RecentNotesFeed } from "@/components/admin/recent-notes-feed";
import { RecentTasksFeed } from "@/components/admin/recent-tasks-feed";

export const metadata: Metadata = {
  title: "Lead Intelligence | Nova Dental Admin",
  description: "Overview of clinic leads, follow-up tasks, and recent patient activity.",
};

export default async function AdminDashboardPage() {
  // Data Access Layer security boundary check
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/admin/login?callbackUrl=/admin/dashboard");
  }

  // Database domain service aggregation
  const metrics = await getDashboardMetrics();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminNav adminEmail={admin.email} />

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 space-y-10">
        {/* Security Session Banner */}
        <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <svg
              className="h-4 w-4 text-teal-700 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z"
              />
            </svg>
            Authenticated Admin Session Active
          </div>
          <span className="text-[11px] text-teal-800">Protected by HttpOnly JWT Session & DAL</span>
        </div>

        {/* Page Heading & Quick Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Lead Intelligence
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Overview of clinic leads, follow-up tasks, and recent patient activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/leads"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700 transition-colors"
            >
              Manage All Leads →
            </Link>
          </div>
        </div>

        {/* SECTION A: Lead Overview */}
        <section aria-labelledby="lead-overview-heading" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 id="lead-overview-heading" className="text-base font-semibold text-slate-900">
                Lead Overview
              </h2>
              <p className="text-xs text-slate-500">
                Inbound consultation inquiries and pipeline conversion stages.
              </p>
            </div>
            <Link
              href="/admin/leads"
              className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
            >
              View table →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            <DashboardStatCard
              label="Total Leads"
              value={metrics.leads.total}
              variant="primary"
              badge="All Time"
              href="/admin/leads"
            />
            <DashboardStatCard
              label="New"
              value={metrics.leads.new}
              variant="teal"
              href="/admin/leads?status=NEW"
            />
            <DashboardStatCard
              label="Contacted"
              value={metrics.leads.contacted}
              variant="amber"
              href="/admin/leads?status=CONTACTED"
            />
            <DashboardStatCard
              label="Qualified"
              value={metrics.leads.qualified}
              variant="emerald"
              href="/admin/leads?status=QUALIFIED"
            />
            <DashboardStatCard
              label="Closed Lost"
              value={metrics.leads.closedLost}
              variant="slate"
              href="/admin/leads?status=CLOSED_LOST"
            />
          </div>
        </section>

        {/* SECTION B: Task Overview */}
        <section aria-labelledby="task-overview-heading" className="space-y-4">
          <div>
            <h2 id="task-overview-heading" className="text-base font-semibold text-slate-900">
              Task Overview
            </h2>
            <p className="text-xs text-slate-500">
              Patient consultation follow-up tasks and administrative workload.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            <DashboardStatCard
              label="Total Tasks"
              value={metrics.tasks.total}
              variant="primary"
              badge="Total"
            />
            <DashboardStatCard
              label="Pending"
              value={metrics.tasks.pending}
              variant="amber"
            />
            <DashboardStatCard
              label="In Progress"
              value={metrics.tasks.inProgress}
              variant="blue"
            />
            <DashboardStatCard
              label="Completed"
              value={metrics.tasks.completed}
              variant="emerald"
            />
            <DashboardStatCard
              label="Cancelled"
              value={metrics.tasks.cancelled}
              variant="slate"
            />
            <DashboardStatCard
              label="Overdue"
              value={metrics.tasks.overdue}
              variant="rose"
              badge={metrics.tasks.overdue > 0 ? "Action Required" : "Clear"}
              subtext={metrics.tasks.overdue > 0 ? "Past due date" : undefined}
            />
          </div>
        </section>

        {/* SECTIONS C, D, E: Recent Feeds Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* SECTION C: Recent Activity */}
          <section aria-labelledby="recent-activity-heading" className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h2
                  id="recent-activity-heading"
                  className="text-sm font-semibold tracking-tight text-slate-900"
                >
                  Recent Activity
                </h2>
                <p className="text-[11px] text-slate-500">Chronological lead event feed</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                Last 5
              </span>
            </div>
            <RecentActivityFeed activities={metrics.recentActivity} />
          </section>

          {/* SECTION D: Recent Notes */}
          <section aria-labelledby="recent-notes-heading" className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h2
                  id="recent-notes-heading"
                  className="text-sm font-semibold tracking-tight text-slate-900"
                >
                  Recent Notes
                </h2>
                <p className="text-[11px] text-slate-500">Team patient inquiry annotations</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                Last 5
              </span>
            </div>
            <RecentNotesFeed notes={metrics.recentNotes} />
          </section>

          {/* SECTION E: Recent Tasks */}
          <section aria-labelledby="recent-tasks-heading" className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h2
                  id="recent-tasks-heading"
                  className="text-sm font-semibold tracking-tight text-slate-900"
                >
                  Recent Tasks
                </h2>
                <p className="text-[11px] text-slate-500">Follow-up actions and reminders</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                Last 5
              </span>
            </div>
            <RecentTasksFeed tasks={metrics.recentTasks} />
          </section>
        </div>
      </main>
    </div>
  );
}
