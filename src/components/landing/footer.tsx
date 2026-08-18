export function Footer() {
  return (
    <footer className="bg-slate-950 py-10 text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <p className="text-lg font-semibold text-white">
            Nova <span className="text-teal-300">Dental</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            A fictional modern dental clinic created for the AI LeadFlow portfolio project.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium" aria-label="Footer navigation">
          <a href="#services" className="hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300">
            Services
          </a>
          <a href="#faq" className="hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300">
            FAQ
          </a>
          <a href="#contact" className="hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300">
            Consultation
          </a>
        </nav>
      </div>
    </footer>
  );
}
