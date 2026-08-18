const questions = [
  {
    question: "What happens during a first consultation?",
    answer:
      "We begin with your questions and what you would like to discuss. The team will outline relevant next steps in clear, practical language.",
  },
  {
    question: "Can I ask about options before booking treatment?",
    answer:
      "Yes. A consultation is designed to make space for questions, context, and a clear conversation about possible options.",
  },
  {
    question: "How do I arrange a consultation?",
    answer:
      "Use the consultation link below to contact the fictional Nova Dental team. A real booking workflow can be added in a future product phase.",
  },
  {
    question: "Is Nova Dental a real clinic?",
    answer:
      "No. Nova Dental is a fictional clinic created as part of the AI LeadFlow portfolio project.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16 lg:px-8">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-teal-800 uppercase">
            FAQ
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Questions, answered simply.
          </h2>
        </div>
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-6 shadow-sm">
          {questions.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="cursor-pointer list-none pr-8 font-semibold text-slate-900 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700">
                <span>{item.question}</span>
                <span className="float-right text-teal-700 group-open:hidden" aria-hidden="true">
                  +
                </span>
                <span className="float-right hidden text-teal-700 group-open:inline" aria-hidden="true">
                  −
                </span>
              </summary>
              <p className="pt-3 leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
