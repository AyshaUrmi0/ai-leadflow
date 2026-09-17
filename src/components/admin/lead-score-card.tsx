"use client";

import type { LeadScoreResult, LeadTemperature } from "@/lib/services/scoring";

interface LeadScoreCardProps {
  scoreResult: LeadScoreResult | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

interface TemperatureMeta {
  label: string;
  subtext: string;
  badgeClass: string;
  barClass: string;
  icon: (className?: string) => React.ReactNode;
}

const temperatureMeta: Record<LeadTemperature, TemperatureMeta> = {
  HOT: {
    label: "Hot Lead",
    subtext: "High engagement & conversion readiness",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    barClass: "bg-emerald-500",
    icon: (className = "h-4 w-4 text-emerald-600") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"
        />
      </svg>
    ),
  },
  WARM: {
    label: "Warm Lead",
    subtext: "Moderate engagement or pending outreach",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    barClass: "bg-amber-500",
    icon: (className = "h-4 w-4 text-amber-600") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
    ),
  },
  COLD: {
    label: "Cold Lead",
    subtext: "Early inquiry, low engagement, or closed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    barClass: "bg-slate-400",
    icon: (className = "h-4 w-4 text-slate-500") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v18m9-9H3m14.5-5.5L6.5 16.5m11 0L6.5 5.5"
        />
      </svg>
    ),
  },
};

export function LeadScoreCard({
  scoreResult,
  isLoading,
  error,
  onRetry,
}: LeadScoreCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse space-y-4"
        aria-busy="true"
        aria-label="Calculating lead score"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded-sm bg-slate-200" />
          <div className="h-6 w-20 rounded-md bg-slate-200" />
        </div>
        <div className="h-9 w-24 rounded-sm bg-slate-200" />
        <div className="h-2 w-full rounded-full bg-slate-100" />
        <div className="space-y-2 pt-2">
          <div className="h-3 w-40 rounded-sm bg-slate-200" />
          <div className="h-3 w-48 rounded-sm bg-slate-100" />
          <div className="h-3 w-36 rounded-sm bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !scoreResult) {
    return (
      <div
        className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-800 space-y-2"
        role="alert"
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold">Unable to load lead score</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-white px-2.5 py-1 font-semibold text-rose-700 border border-rose-200 shadow-xs hover:bg-rose-50 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
        <p className="text-[11px] text-rose-600">
          {error || "An unexpected error occurred while evaluating lead intelligence."}
        </p>
      </div>
    );
  }

  const { score, temperature, reasons } = scoreResult;
  const meta = temperatureMeta[temperature];

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
      role="region"
      aria-label={`Lead Intelligence: Score ${score} out of 100, ${meta.label}`}
    >
      {/* Header: Title & Temperature Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Lead Intelligence
          </h3>
          <p className="text-[11px] text-slate-500">Deterministic qualification score</p>
        </div>

        {/* Temperature Badge (not relying on color alone: displays icon + explicit text) */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.badgeClass}`}
        >
          {meta.icon()}
          <span>{meta.label}</span>
        </span>
      </div>

      {/* Main Metric Display: Numeric Score & Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-slate-950 font-sans">
              {score}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ 100</span>
          </div>

          <span className="text-xs text-slate-500 font-medium">{meta.subtext}</span>
        </div>

        {/* Visual Score Meter */}
        <div
          className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Score progress bar: ${score} percent`}
        >
          <div
            className={`h-full transition-all duration-500 ease-out ${meta.barClass}`}
            style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
          />
        </div>
      </div>

      {/* Scoring Factors / Reasons */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Scoring Factors
        </h4>

        {reasons.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No positive scoring factors identified yet.</p>
        ) : (
          <ul className="space-y-1.5" role="list">
            {reasons.map((reason) => {
              const isClosedLostReason = reason.toLowerCase().includes("closed lost");
              return (
                <li
                  key={reason}
                  className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed"
                >
                  {isClosedLostReason ? (
                    <span className="shrink-0 text-rose-500 mt-0.5" aria-hidden="true">
                      ⚠️
                    </span>
                  ) : (
                    <span className="shrink-0 text-teal-600 mt-0.5 font-bold" aria-hidden="true">
                      ✓
                    </span>
                  )}
                  <span className={isClosedLostReason ? "font-medium text-rose-700" : ""}>
                    {reason}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
