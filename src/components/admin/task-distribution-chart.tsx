"use client";

import { useState } from "react";
import type { TaskMetrics } from "@/lib/services/dashboard";

interface TaskDistributionChartProps {
  tasks: TaskMetrics;
}

type ChartViewType = "donut" | "bars";

export function TaskDistributionChart({ tasks }: TaskDistributionChartProps) {
  const [chartView, setChartView] = useState<ChartViewType>("donut");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const total = tasks.total;
  const completionRate =
    total > 0 ? Math.round((tasks.completed / total) * 100) : 0;

  const statusItems = [
    {
      key: "completed",
      label: "Completed",
      count: tasks.completed,
      hex: "#10b981", // emerald-500
      bgClass: "bg-emerald-500",
      lightBg: "bg-emerald-50/70",
      borderClass: "border-emerald-200",
      textClass: "text-emerald-800",
      description: "Successfully resolved tasks",
    },
    {
      key: "inProgress",
      label: "In Progress",
      count: tasks.inProgress,
      hex: "#3b82f6", // blue-500
      bgClass: "bg-blue-500",
      lightBg: "bg-blue-50/70",
      borderClass: "border-blue-200",
      textClass: "text-blue-800",
      description: "Under active review",
    },
    {
      key: "pending",
      label: "Pending",
      count: tasks.pending,
      hex: "#f59e0b", // amber-500
      bgClass: "bg-amber-500",
      lightBg: "bg-amber-50/70",
      borderClass: "border-amber-200",
      textClass: "text-amber-800",
      description: "Awaiting staff action",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: tasks.cancelled,
      hex: "#94a3b8", // slate-400
      bgClass: "bg-slate-400",
      lightBg: "bg-slate-50/70",
      borderClass: "border-slate-200",
      textClass: "text-slate-700",
      description: "Dismissed or archived",
    },
  ];

  // SVG Donut metrics
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  let cumulativeOffset = 0;
  const slices = statusItems.map((item) => {
    const fraction = total > 0 ? item.count / total : 0;
    const sliceLength = fraction * circumference;
    const strokeDasharray = `${sliceLength} ${circumference}`;
    const strokeDashoffset = -cumulativeOffset;
    cumulativeOffset += sliceLength;
    const percentage = total > 0 ? Math.round(fraction * 100) : 0;

    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeHoveredItem = hoveredKey
    ? slices.find((s) => s.key === hoveredKey)
    : null;

  const maxCount = Math.max(...statusItems.map((i) => i.count), 1);

  return (
    <div className="space-y-5">
      {/* Header controls: View Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => setChartView("donut")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              chartView === "donut"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                strokeWidth={2}
                strokeDasharray="28 14"
              />
            </svg>
            Donut
          </button>
          <button
            type="button"
            onClick={() => setChartView("bars")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              chartView === "bars"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Bars
          </button>
        </div>

        <span className="text-xs font-medium text-slate-500">
          <strong className="text-slate-900 font-semibold">{total}</strong> total tasks
        </span>
      </div>

      {/* Main Chart Presentation */}
      {chartView === "donut" ? (
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-12">
          {/* Donut SVG Illustration */}
          <div className="relative flex justify-center sm:col-span-5">
            <div className="relative h-44 w-44">
              <svg
                viewBox="0 0 100 100"
                className="h-full w-full transform -rotate-90 transition-all duration-300"
              >
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="11"
                />

                {/* Slices */}
                {total > 0 ? (
                  slices.map((slice) => {
                    const isHovered = hoveredKey === slice.key;
                    return (
                      <circle
                        key={slice.key}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={slice.hex}
                        strokeWidth={isHovered ? "13" : "11"}
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        strokeLinecap="round"
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setHoveredKey(slice.key)}
                        onMouseLeave={() => setHoveredKey(null)}
                      />
                    );
                  })
                ) : (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="11"
                  />
                )}
              </svg>

              {/* Center Metrics Label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                {activeHoveredItem ? (
                  <>
                    <span
                      className="text-2xl font-bold tracking-tight"
                      style={{ color: activeHoveredItem.hex }}
                    >
                      {activeHoveredItem.count}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {activeHoveredItem.label} ({activeHoveredItem.percentage}%)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {completionRate}%
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      Resolved
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown List beside donut */}
          <div className="space-y-2.5 sm:col-span-7">
            {slices.map((item) => {
              const isHovered = hoveredKey === item.key;
              return (
                <div
                  key={item.key}
                  onMouseEnter={() => setHoveredKey(item.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all ${
                    isHovered
                      ? `${item.borderClass} ${item.lightBg} shadow-xs`
                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.bgClass}`}
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-900">
                      {item.count}
                    </span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200/80">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Comparative Bar Chart View */
        <div className="space-y-4 pt-2">
          {slices.map((item) => {
            const barWidthPercent =
              maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const isHovered = hoveredKey === item.key;

            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span
                      className={`h-2 w-2 rounded-full ${item.bgClass}`}
                    />
                    {item.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    <strong className="text-slate-900 font-semibold">
                      {item.count}
                    </strong>{" "}
                    tasks ({item.percentage}%)
                  </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${Math.max(barWidthPercent, 3)}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.bgClass
                    } ${isHovered ? "opacity-100 scale-y-110" : "opacity-85"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Overdue Alert or Health Status Banner */}
      <div
        className={`flex items-center justify-between rounded-xl border p-3 text-xs transition-colors ${
          tasks.overdue > 0
            ? "border-rose-200 bg-rose-50/80 text-rose-900"
            : "border-emerald-200 bg-emerald-50/80 text-emerald-900"
        }`}
      >
        <div className="flex items-center gap-2">
          {tasks.overdue > 0 ? (
            <svg
              className="h-4 w-4 shrink-0 text-rose-600 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 shrink-0 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          <span className="font-medium">
            {tasks.overdue > 0
              ? `${tasks.overdue} task(s) past due date requiring clinical follow-up`
              : "All follow-up tasks are operating on schedule"}
          </span>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            tasks.overdue > 0
              ? "bg-rose-200/80 text-rose-950"
              : "bg-emerald-200/80 text-emerald-950"
          }`}
        >
          {tasks.overdue > 0 ? "Action Required" : "Healthy"}
        </span>
      </div>
    </div>
  );
}
