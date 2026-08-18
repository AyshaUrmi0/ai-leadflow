const visitSteps = [
  ["01", "Start with a conversation", "Share what you would like to discuss and ask any questions."],
  ["02", "Review your options", "Receive clear guidance to help you decide what feels right."],
  ["03", "Plan your next step", "Leave with a practical plan and a straightforward way to book."],
];

export function Hero() {
  return (
    <section id="top" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-semibold tracking-[0.16em] text-teal-800 uppercase">Thoughtful dentistry, clearly explained</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Dental care that helps you feel at ease.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Nova Dental is a fictional modern clinic where experienced professionals, practical technology, and a comfortable pace come together for every visit.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#contact" className="inline-flex min-h-12 items-center justify-center rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Arrange a consultation</a>
            <a href="#services" className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Explore our services</a>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-teal-800">Your visit, your pace</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Clear steps from first conversation to follow-up.</h2>
          <ol className="mt-8 space-y-5" aria-label="Consultation process">
            {visitSteps.map(([number, title, description]) => (
              <li key={number} className="flex gap-4 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
                <span className="font-mono text-sm font-semibold text-teal-700" aria-hidden="true">{number}</span>
                <div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
