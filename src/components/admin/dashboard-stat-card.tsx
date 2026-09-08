import Link from "next/link";
import type { ReactNode } from "react";

export type StatCardVariant =
  | "primary"
  | "teal"
  | "amber"
  | "emerald"
  | "blue"
  | "slate"
  | "rose";

interface DashboardStatCardProps {
  label: string;
  value: number;
  variant?: StatCardVariant;
  href?: string;
  badge?: string;
  subtext?: string;
  icon?: ReactNode;
}

const variantStyles: Record<
  StatCardVariant,
  {
    container: string;
    label: string;
    value: string;
    badge: string;
    hover: string;
  }
> = {
  primary: {
    container: "border-slate-300 bg-white shadow-xs",
    label: "text-slate-600",
    value: "text-slate-950",
    badge: "bg-slate-100 text-slate-800 border-slate-200",
    hover: "hover:border-slate-400 hover:shadow-sm",
  },
  teal: {
    container: "border-teal-200 bg-teal-50/50 shadow-xs",
    label: "text-teal-800",
    value: "text-teal-950",
    badge: "bg-teal-100 text-teal-800 border-teal-200",
    hover: "hover:border-teal-300 hover:shadow-sm",
  },
  amber: {
    container: "border-amber-200 bg-amber-50/50 shadow-xs",
    label: "text-amber-800",
    value: "text-amber-950",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    hover: "hover:border-amber-300 hover:shadow-sm",
  },
  emerald: {
    container: "border-emerald-200 bg-emerald-50/50 shadow-xs",
    label: "text-emerald-800",
    value: "text-emerald-950",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    hover: "hover:border-emerald-300 hover:shadow-sm",
  },
  blue: {
    container: "border-blue-200 bg-blue-50/50 shadow-xs",
    label: "text-blue-800",
    value: "text-blue-950",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    hover: "hover:border-blue-300 hover:shadow-sm",
  },
  slate: {
    container: "border-slate-200 bg-slate-100/60 shadow-xs",
    label: "text-slate-600",
    value: "text-slate-900",
    badge: "bg-slate-200 text-slate-700 border-slate-300",
    hover: "hover:border-slate-300 hover:shadow-sm",
  },
  rose: {
    container: "border-rose-200 bg-rose-50/60 shadow-xs",
    label: "text-rose-800",
    value: "text-rose-950",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    hover: "hover:border-rose-300 hover:shadow-sm",
  },
};

export function DashboardStatCard({
  label,
  value,
  variant = "primary",
  href,
  badge,
  subtext,
  icon,
}: DashboardStatCardProps) {
  const styles = variantStyles[variant];

  const content = (
    <div
      className={`relative rounded-xl border p-4 transition-all ${styles.container} ${
        href ? `${styles.hover} cursor-pointer` : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold uppercase tracking-wider ${styles.label}`}>
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${styles.badge}`}
            >
              {badge}
            </span>
          )}
          {icon && <span className="text-slate-400">{icon}</span>}
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${styles.value}`}>
          {value.toLocaleString()}
        </p>
        {href && (
          <span className="text-[11px] font-medium text-slate-500 opacity-80 group-hover:opacity-100">
            View →
          </span>
        )}
      </div>

      {subtext && <p className="mt-1 text-[11px] text-slate-500">{subtext}</p>}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 rounded-xl"
        aria-label={`${label}: ${value} leads. Click to view filtered list.`}
      >
        {content}
      </Link>
    );
  }

  return content;
}
