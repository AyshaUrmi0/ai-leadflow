import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/dal";
import { deleteSession } from "@/lib/auth/session";
import { getTeamMembers } from "@/lib/services/user";
import { AdminNav } from "@/components/admin/admin-nav";
import { TeamTable } from "@/components/admin/team/team-table";

export const metadata: Metadata = {
  title: "Team & Access Management | Nova Dental Admin",
  description: "Manage clinic administrators, staff accounts, and role-based permissions.",
};

export default async function AdminTeamPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    await deleteSession();
    redirect("/login?callbackUrl=/admin/team");
  }

  const rawMembers = await getTeamMembers();

  const members = rawMembers.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  const totalMembers = members.length;
  const adminCount = members.filter((m) => m.role === "ADMIN").length;
  const staffCount = members.filter((m) => m.role === "USER").length;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900">
      <AdminNav adminEmail={admin.email} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                  Team & Access Control
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">
                  Role-Based Access Management
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Staff & Administrators
              </h1>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Manage clinic coordinators, view team member activity across leads and follow-up tasks, and provision new administrator accounts with database-enforced permissions.
              </p>
            </div>
          </div>

          {/* Metric Highlights */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-slate-100 pt-6">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Team Accounts
              </span>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {totalMembers}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Active clinic users in database
              </p>
            </div>

            <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-4">
              <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">
                Active Administrators
              </span>
              <div className="mt-1 text-2xl font-bold text-teal-900">
                {adminCount}
              </div>
              <p className="mt-0.5 text-[11px] text-teal-700">
                Full triage, AI & access permissions
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Staff & Portal Accounts
              </span>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {staffCount}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Standard user accounts
              </p>
            </div>
          </div>
        </div>

        {/* Team Table */}
        <section aria-labelledby="team-directory-heading">
          <h2 id="team-directory-heading" className="sr-only">
            Team Directory & Access Management
          </h2>
          <TeamTable members={members} currentAdminId={admin.id} />
        </section>
      </main>
    </div>
  );
}
