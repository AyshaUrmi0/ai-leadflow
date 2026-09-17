"use client";

import type { LeadIntelligence, LeadUrgency, RecommendedTiming } from "@/lib/validations/intelligence";

interface LeadAICardProps {
  data: LeadIntelligence | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
  onRetry: () => void;
}

interface UrgencyMeta {
  label: string;
  badgeClass: string;
  icon: () => React.ReactNode;
}

const urgencyMeta: Record<LeadUrgency, UrgencyMeta> = {
  HIGH: {
    label: "Urgency: High",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    icon: () => (
      <svg className="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  MEDIUM: {
    label: "Urgency: Medium",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    icon: () => (
      <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  LOW: {
    label: "Urgency: Low",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    icon: () => (
      <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const timingLabels: Record<RecommendedTiming, string> = {
  IMMEDIATE: "Immediate (Within 24h)",
  WITHIN_24_HOURS: "Within 24 Hours",
  WITHIN_3_DAYS: "Within 3 Days",
  NO_ACTION_NEEDED: "No Action Needed",
};

export function LeadAICard({
  data,
  isLoading,
  error,
  onGenerate,
  onRetry,
}: LeadAICardProps) {
  // 1. Loading State
  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
        role="region"
        aria-busy="true"
        aria-label="Generating AI lead insights"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-600 animate-ping" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              AI Advisory Insights
            </h3>
          </div>
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Advisory Only
          </span>
        </div>

        <div className="animate-pulse space-y-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-medium text-teal-800">
            <svg className="animate-spin h-4 w-4 text-teal-700" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Analyzing lead context &amp; generating recommendations...</span>
          </div>

          <div className="h-14 w-full rounded-lg bg-slate-100" />
          <div className="space-y-2 pt-1">
            <div className="h-3 w-3/4 rounded-sm bg-slate-200" />
            <div className="h-3 w-1/2 rounded-sm bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-xs text-rose-800 space-y-3"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="font-semibold text-rose-900">Unable to generate AI insights</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200 shadow-xs hover:bg-rose-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-600"
          >
            Retry
          </button>
        </div>
        <p className="text-[11px] text-rose-700 leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  // 3. Initial / Ungenerated State
  if (!data) {
    return (
      <div
        className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 space-y-3 text-center sm:text-left"
        role="region"
        aria-label="AI Advisory Insights"
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-teal-700 font-bold" aria-hidden="true">✦</span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                AI Advisory Insights
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              On-demand summary, observations, and recommended action
            </p>
          </div>
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Advisory Only
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Generate an AI-powered administrative brief synthesizing the patient&apos;s inquiry, engagement history, and recommended next action.
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-teal-700 cursor-pointer transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            <span>Generate AI Insight</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Generated State
  const urgency = urgencyMeta[data.urgency];
  const { suggestedNextAction } = data;
  const timingText = timingLabels[suggestedNextAction.recommendedTiming] || suggestedNextAction.recommendedTiming;

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
      role="region"
      aria-label="AI Advisory Insights"
    >
      {/* Header: Title, Advisory Pill & Urgency Badge */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-teal-700 font-bold" aria-hidden="true">✦</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              AI Advisory Insights
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Advisory assistant &bull; Non-deterministic guidance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Explicit Urgency Badge (with icon + label for accessibility) */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${urgency.badgeClass}`}
            role="status"
            aria-label={`Lead urgency level: ${data.urgency}`}
          >
            {urgency.icon()}
            <span>{urgency.label}</span>
          </span>

          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Advisory Only
          </span>
        </div>
      </div>

      {/* 1. Summary */}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Summary
        </h4>
        <div className="rounded-lg bg-slate-50/80 border border-slate-200/80 p-3 text-xs leading-relaxed text-slate-800">
          {data.summary}
        </div>
      </div>

      {/* 2. Key Observations */}
      {data.keyObservations.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Key Observations
          </h4>
          <ul className="space-y-1.5" role="list">
            {data.keyObservations.map((observation) => (
              <li
                key={observation}
                className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed"
              >
                <span className="shrink-0 text-teal-600 mt-0.5 font-bold" aria-hidden="true">
                  &bull;
                </span>
                <span>{observation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Recommended Next Action */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Recommended Next Action
        </h4>

        <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h5 className="text-xs font-bold text-slate-900">
              {suggestedNextAction.title}
            </h5>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Timing Badge */}
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-100/80 text-teal-900 border border-teal-200 px-2 py-0.5 text-[11px] font-semibold">
                <svg className="h-3 w-3 text-teal-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{timingText}</span>
              </span>

              {/* Suggested Due Date Days */}
              {suggestedNextAction.suggestedDueDateDaysFromNow !== null && (
                <span className="inline-flex items-center rounded-md bg-white text-slate-700 border border-slate-200 px-2 py-0.5 text-[11px] font-medium">
                  {suggestedNextAction.suggestedDueDateDaysFromNow === 0
                    ? "Due Today"
                    : `Due in ${suggestedNextAction.suggestedDueDateDaysFromNow}d`}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">
            {suggestedNextAction.description}
          </p>
        </div>
      </div>

      {/* Footer: Refresh action */}
      <div className="border-t border-slate-100 pt-2 flex justify-end">
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 hover:text-teal-950 focus-visible:outline-2 focus-visible:outline-teal-700 cursor-pointer"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span>Refresh Insight</span>
        </button>
      </div>
    </div>
  );
}
