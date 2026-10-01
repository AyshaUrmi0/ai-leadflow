"use client";

import { useState, useTransition } from "react";
import { createTeamMemberAction, type CreateTeamMemberState } from "@/app/admin/team/actions";
import { Role } from "@prisma/client";

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMemberModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.ADMIN);
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<CreateTeamMemberState | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{
    name: string;
    email: string;
    password: string;
    role: Role;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let generated = "";
    for (let i = 0; i < 14; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (!createdSummary?.password) return;
    try {
      await navigator.clipboard.writeText(createdSummary.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      setCopied(true);
    }
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole(Role.ADMIN);
    setState(null);
    setCreatedSummary(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("password", password);
    formData.set("role", role);

    const capturedPassword = password;
    const capturedName = name;
    const capturedEmail = email;
    const capturedRole = role;

    startTransition(async () => {
      const result = await createTeamMemberAction(undefined, formData);
      if (result.success) {
        setCreatedSummary({
          name: capturedName,
          email: capturedEmail,
          password: capturedPassword,
          role: capturedRole,
        });
        setName("");
        setEmail("");
        setPassword("");
        setRole(Role.ADMIN);
        setState(null);
        onSuccess();
      } else {
        setState(result);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">
              {createdSummary ? "Account Provisioned" : "Add Team Member"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {createdSummary
                ? "The team member account has been registered in the database."
                : "Provision a new administrator or clinic staff member."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-teal-700 cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success Confirmation Screen with Secure One-Time Password Copy */}
        {createdSummary ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Account created successfully for {createdSummary.name}</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-800 space-y-0.5">
                <div><strong>Email:</strong> {createdSummary.email}</div>
                <div>
                  <strong>Role:</strong>{" "}
                  {createdSummary.role === Role.ADMIN ? "Administrator" : "Staff Member"}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Initial Password
                </span>
                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  One-time display
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdSummary.password}
                  className="w-full font-mono text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                As the administrator, you are responsible for securely communicating this temporary password to the team member. For security, this plaintext password will never be shown again and is not stored in plain text anywhere on the server.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Global Error Banner */}
            {state?.error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800" role="alert">
                <div className="flex items-center gap-2 font-medium">
                  <svg className="h-4 w-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{state.error}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="member-name" className="block text-xs font-semibold text-slate-800">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="member-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Sarah Jenkins"
                  disabled={isPending}
                  className={`mt-1.5 w-full rounded-xl border px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-700 transition-all ${
                    state?.fieldErrors?.name ? "border-rose-300 bg-rose-50/30" : "border-slate-300 bg-white"
                  }`}
                />
                {state?.fieldErrors?.name && (
                  <p className="mt-1 text-[11px] text-rose-600">{state.fieldErrors.name[0]}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="member-email" className="block text-xs font-semibold text-slate-800">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="member-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sjenkins@novadental.com"
                  disabled={isPending}
                  className={`mt-1.5 w-full rounded-xl border px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-700 transition-all ${
                    state?.fieldErrors?.email ? "border-rose-300 bg-rose-50/30" : "border-slate-300 bg-white"
                  }`}
                />
                {state?.fieldErrors?.email && (
                  <p className="mt-1 text-[11px] text-rose-600">{state.fieldErrors.email[0]}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="member-password" className="block text-xs font-semibold text-slate-800">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    disabled={isPending}
                    className="text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                  >
                    Generate secure password
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="member-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={isPending}
                    className={`w-full rounded-xl border px-3.5 py-2 pr-16 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-700 transition-all font-mono ${
                      state?.fieldErrors?.password ? "border-rose-300 bg-rose-50/30" : "border-slate-300 bg-white"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {state?.fieldErrors?.password && (
                  <p className="mt-1 text-[11px] text-rose-600">{state.fieldErrors.password[0]}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  System Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* ADMIN Option */}
                  <label
                    className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition-all ${
                      role === Role.ADMIN
                        ? "border-teal-600 bg-teal-50/40 ring-1 ring-teal-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-teal-600" />
                        Administrator
                      </span>
                      <input
                        type="radio"
                        name="role"
                        value={Role.ADMIN}
                        checked={role === Role.ADMIN}
                        onChange={() => setRole(Role.ADMIN)}
                        disabled={isPending}
                        className="text-teal-700 focus:ring-teal-600"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      Full access to leads triage, team accounts, AI insights, and system settings.
                    </p>
                  </label>

                  {/* USER Option */}
                  <label
                    className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition-all ${
                      role === Role.USER
                        ? "border-teal-600 bg-teal-50/40 ring-1 ring-teal-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        Staff Member
                      </span>
                      <input
                        type="radio"
                        name="role"
                        value={Role.USER}
                        checked={role === Role.USER}
                        onChange={() => setRole(Role.USER)}
                        disabled={isPending}
                        className="text-teal-700 focus:ring-teal-600"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      Standard clinic role. Can be assigned tasks and review user portal.
                    </p>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isPending ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
