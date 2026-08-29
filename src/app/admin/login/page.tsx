"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginActionState } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/leads";

  const [state, formAction, isPending] = useActionState<LoginActionState, FormData>(
    loginAction,
    {}
  );

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      {/* Alert Error Banner */}
      {state?.error && (
        <div
          className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-300"
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
            {state.error}
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-6">
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
            placeholder="admin@novadental.com"
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
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors"
          />
          {state?.fieldErrors?.password && (
            <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full cursor-pointer rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-500 focus-visible:outline-2 focus-visible:outline-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            "Sign In to Admin Portal"
          )}
        </button>
      </form>

      {/* Footer Back Link */}
      <div className="mt-6 border-t border-slate-700/60 pt-4 text-center">
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

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white">
          Nova <span className="text-teal-400">Dental</span>
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-100">
          Admin Portal Sign In
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Internal access for lead management and patient inquiries.
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
