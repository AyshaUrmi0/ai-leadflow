"use client";

import { Suspense, useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, demoLoginAction, type LoginActionState } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [state, formAction, isPending] = useActionState<LoginActionState, FormData>(
    loginAction,
    {}
  );

  const [isDemoPending, startDemoTransition] = useTransition();
  const [activeDemoRole, setActiveDemoRole] = useState<"ADMIN" | "USER" | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleDemoLogin = (role: "ADMIN" | "USER") => {
    setActiveDemoRole(role);
    setDemoError(null);
    startDemoTransition(async () => {
      const res = await demoLoginAction(role);
      if (res?.error) {
        setDemoError(res.error);
        setActiveDemoRole(null);
      }
    });
  };

  const errorMessage = state?.error || demoError;

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
      {/* Alert Error Banner */}
      {errorMessage && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-300"
          role="alert"
        >
          <div className="flex items-center gap-2 font-medium">
            <svg
              className="h-5 w-5 text-red-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Manual Email/Password Form */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@example.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors"
          />
          {state?.fieldErrors?.email && (
            <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 pl-4 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:text-teal-400 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.75"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.75"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              )}
            </button>
          </div>
          {state?.fieldErrors?.password && (
            <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || isDemoPending}
          className="w-full cursor-pointer rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-500 focus-visible:outline-2 focus-visible:outline-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Authenticating...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        {/* Register Link */}
        <div className="text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors"
          >
            Create one
          </Link>
        </div>
      </form>

      {/* Recruiter Demo Access Section */}
      <div className="relative border-t border-slate-700/80 pt-6">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Or One-Click Demo Access
        </div>

        <p className="text-xs text-slate-400 text-center mb-4">
          Instantly evaluate user roles without typing credentials:
        </p>

        <div className="space-y-3">
          {/* Admin Demo Button */}
          <button
            type="button"
            onClick={() => handleDemoLogin("ADMIN")}
            disabled={isPending || isDemoPending}
            className="w-full group cursor-pointer text-left rounded-xl border border-teal-500/30 bg-teal-950/30 p-3.5 hover:bg-teal-900/40 hover:border-teal-400/50 focus-visible:outline-2 focus-visible:outline-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-teal-500/20 border border-teal-400/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300">
                  ADMIN
                </span>
                <span className="text-sm font-semibold text-white group-hover:text-teal-200 transition-colors">
                  {isDemoPending && activeDemoRole === "ADMIN"
                    ? "Signing in as Admin Demo..."
                    : "Login as Admin Demo"}
                </span>
              </div>
              {isDemoPending && activeDemoRole === "ADMIN" ? (
                <svg className="h-4 w-4 animate-spin text-teal-400" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <span className="text-xs text-teal-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-normal">
              Explore lead management, CRM workflow, notes, tasks, activity history, and AI lead intelligence.
            </p>
          </button>

          {/* User Demo Button */}
          <button
            type="button"
            onClick={() => handleDemoLogin("USER")}
            disabled={isPending || isDemoPending}
            className="w-full group cursor-pointer text-left rounded-xl border border-blue-500/30 bg-blue-950/30 p-3.5 hover:bg-blue-900/40 hover:border-blue-400/50 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  USER
                </span>
                <span className="text-sm font-semibold text-white group-hover:text-blue-200 transition-colors">
                  {isDemoPending && activeDemoRole === "USER"
                    ? "Signing in as User Demo..."
                    : "Login as User Demo"}
                </span>
              </div>
              {isDemoPending && activeDemoRole === "USER" ? (
                <svg className="h-4 w-4 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <span className="text-xs text-blue-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-normal">
              Explore the application with standard user permissions and verify role-based route protection.
            </p>
          </button>
        </div>
      </div>

      {/* Footer Back Link */}
      <div className="border-t border-slate-700/60 pt-4 text-center">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-teal-400 transition-colors"
        >
          ← Back to Public Website
        </Link>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl animate-pulse flex items-center justify-center min-h-[300px]">
      <p className="text-sm text-slate-400">Loading sign in portal...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white">
          Nova <span className="text-teal-400">Dental</span>
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-100">
          Sign In to Your Account
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Access your consultations, patient portal, or admin workspace.
        </p>
      </div>

      {/* Suspense Wrapped Login Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
