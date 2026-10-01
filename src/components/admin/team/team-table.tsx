"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRoleAction } from "@/app/admin/team/actions";
import { CreateMemberModal } from "./create-member-modal";

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
  updatedAt: string;
  _count: {
    assignedTasks: number;
    authoredNotes: number;
    leads: number;
  };
}

interface TeamTableProps {
  members: TeamMember[];
  currentAdminId: string;
}

export function TeamTable({ members, currentAdminId }: TeamTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    member: TeamMember;
    newRole: "ADMIN" | "USER";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const adminCount = members.filter((m) => m.role === "ADMIN").length;

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      (member.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      member.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "ALL" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (member: TeamMember, newRole: "ADMIN" | "USER") => {
    setActionError(null);
    setActionSuccess(null);
    setConfirmTarget({ member, newRole });
  };

  const executeRoleChange = () => {
    if (!confirmTarget) return;

    setActionError(null);
    setActionSuccess(null);

    const { member, newRole } = confirmTarget;

    startTransition(async () => {
      const res = await updateUserRoleAction(member.id, newRole);
      if (res.success) {
        setActionSuccess(
          `Successfully updated role for ${member.name || member.email} to ${
            newRole === "ADMIN" ? "Administrator" : "Staff Member"
          }.`
        );
        setConfirmTarget(null);
        router.refresh();
      } else {
        setActionError(res.error || "Failed to update member role.");
        setConfirmTarget(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast / Notification Banners */}
      {actionSuccess && (
        <div
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs text-emerald-900 shadow-2xs"
          role="status"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div
          className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-xs text-rose-900 shadow-2xs"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Bar: Search, Role Filter, and Add Member Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30 transition-all shadow-2xs"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            {(["ALL", "ADMIN", "USER"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRoleFilter(filter)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  roleFilter === filter
                    ? "bg-teal-50 text-teal-900 border border-teal-200/80 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {filter === "ALL" ? "All Accounts" : filter === "ADMIN" ? "Admins" : "Staff"}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setActionSuccess(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 cursor-pointer transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th scope="col" className="py-3.5 pl-6 pr-3">User & Email</th>
                <th scope="col" className="px-3 py-3.5">Role</th>
                <th scope="col" className="px-3 py-3.5">Activity & Workload</th>
                <th scope="col" className="px-3 py-3.5">Account Created</th>
                <th scope="col" className="py-3.5 pl-3 pr-6 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <p className="font-medium">No team members found.</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {search ? "Try adjusting your search criteria." : "Click 'Add Team Member' to create the first account."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isCurrentAdmin = member.id === currentAdminId;
                  const isLastAdmin = member.role === "ADMIN" && adminCount <= 1;
                  const initials = (member.name || member.email)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const createdDate = new Date(member.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                              member.role === "ADMIN"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">
                                {member.name || "Clinic Staff"}
                              </span>
                              {isCurrentAdmin && (
                                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 ring-1 ring-inset ring-teal-600/20">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 text-[11px]">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-3 py-4">
                        {member.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-900 border border-teal-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                            Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Staff Member
                          </span>
                        )}
                      </td>

                      {/* Workload / Activity Stats */}
                      <td className="px-3 py-4">
                        <div className="space-y-0.5 text-[11px] text-slate-600">
                          <div>
                            <span className="font-medium text-slate-900">
                              {member._count.assignedTasks}
                            </span>{" "}
                            tasks assigned
                          </div>
                          <div className="text-slate-400">
                            {member._count.authoredNotes} notes authored
                          </div>
                        </div>
                      </td>

                      {/* Account Created Date */}
                      <td className="px-3 py-4 text-slate-500 text-[11px]">
                        {createdDate}
                      </td>

                      {/* Action Controls */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        {isCurrentAdmin ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 italic"
                            title="You cannot modify your own role to prevent accidental lockout."
                          >
                            <span>Current Session (You)</span>
                          </span>
                        ) : member.role === "ADMIN" ? (
                          <button
                            type="button"
                            disabled={isLastAdmin || isPending}
                            onClick={() => handleRoleChange(member, "USER")}
                            title={
                              isLastAdmin
                                ? "Cannot demote the clinic's sole administrator to prevent system lockout."
                                : "Demote this user to staff"
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                              isLastAdmin || isPending
                                ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 cursor-pointer"
                            }`}
                          >
                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            <span>Demote to Staff</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRoleChange(member, "ADMIN")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100 hover:border-teal-300 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <svg className="h-3.5 w-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            <span>Promote to Admin</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Role Modification */}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-7">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Role Change
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to change the role for{" "}
              <strong className="text-slate-900">
                {confirmTarget.member.name || confirmTarget.member.email}
              </strong>{" "}
              to{" "}
              <strong className="text-teal-800">
                {confirmTarget.newRole === "ADMIN" ? "Administrator" : "Staff Member"}
              </strong>
              ?
            </p>
            {confirmTarget.newRole === "USER" && (
              <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-800 border border-amber-200">
                Warning: This user will immediately lose administrative access to leads triage, team management, and clinic settings.
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRoleChange}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Confirm Change</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Member Modal */}
      <CreateMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setActionSuccess("New team member provisioned successfully.");
          router.refresh();
        }}
      />
    </div>
  );
}
