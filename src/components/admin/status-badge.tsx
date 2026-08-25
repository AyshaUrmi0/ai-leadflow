import type { LeadStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: LeadStatus;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  NEW: {
    label: "New",
    className: "bg-teal-50 text-teal-800 border-teal-200",
  },
  CONTACTED: {
    label: "Contacted",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  QUALIFIED: {
    label: "Qualified",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  CLOSED_LOST: {
    label: "Closed Lost",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}
