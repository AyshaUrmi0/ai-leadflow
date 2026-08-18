const navigationItems = [
  { href: "#services", label: "Services" },
  { href: "#why-nova", label: "Why Nova" },
  { href: "#testimonials", label: "Patient experience" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/95">
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 z-50 rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-6 lg:px-8">
        <a href="#top" className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700" aria-label="Nova Dental home">
          Nova <span className="text-teal-700">Dental</span>
        </a>
        <nav className="order-3 flex w-full items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 sm:order-none sm:ml-auto sm:w-auto" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <a key={item.href} href={item.href} className="whitespace-nowrap hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700">
              {item.label}
            </a>
          ))}
        </nav>
        <a href="#contact" className="ml-auto inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:ml-0">
          Book a consultation
        </a>
      </div>
    </header>
  );
}
