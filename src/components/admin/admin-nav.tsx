"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/admin/login/actions";

interface AdminNavProps {
  adminEmail: string;
}

export function AdminNav({ adminEmail }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      isActive: pathname === "/admin/dashboard" || pathname === "/admin",
    },
    {
      label: "Leads",
      href: "/admin/leads",
      isActive: pathname === "/admin/leads" || pathname.startsWith("/admin/leads/"),
    },
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
              Nova <span className="text-teal-700">Dental</span>
            </Link>
            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
              Admin Portal
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1" aria-label="Admin Navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.isActive ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  item.isActive
                    ? "bg-teal-50 text-teal-900 font-semibold border border-teal-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block text-xs text-slate-600 font-medium">
            Signed in as <strong className="text-slate-900">{adminEmail}</strong>
          </span>

          <form action={logoutAction}>
            <button
              type="submit"
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
