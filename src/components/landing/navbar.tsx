import Link from "next/link";

interface NavbarProps {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
  } | null;
}

const navigationItems = [
  { href: "#services", label: "Services" },
  { href: "#why-nova", label: "Why Nova" },
  { href: "#testimonials", label: "Patient experience" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar({ user }: NavbarProps = {}) {
  return (
    <header className="border-b border-slate-200 bg-white/95 sticky top-0 z-30 backdrop-blur-xs">
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 z-50 rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
          aria-label="Nova Dental home"
        >
          Nova <span className="text-teal-700">Dental</span>
        </a>
        <nav
          className="order-3 flex w-full items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 sm:order-none sm:ml-auto sm:w-auto"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 sm:ml-0">
          {user ? (
            <Link
              href={user.role === "ADMIN" ? "/admin/dashboard" : "/portal"}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-3.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 transition-colors"
            >
              {user.role === "ADMIN" ? "Admin Dashboard →" : "My Portal →"}
            </Link>
          ) : (
            <>
              <Link
                href="/admin/login"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex min-h-10 items-center justify-center rounded-md border border-teal-600 bg-teal-50 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 transition-colors"
              >
                Create Account
              </Link>
            </>
          )}

          <a
            href="#contact"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 transition-colors shadow-xs"
          >
            Book a consultation
          </a>
        </div>
      </div>
    </header>
  );
}
