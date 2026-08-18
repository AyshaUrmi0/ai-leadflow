const reasons = [
  {
    title: "Experienced, attentive professionals",
    description:
      "Appointments are built around listening first, then explaining options in plain language.",
  },
  {
    title: "Technology with a purpose",
    description:
      "Modern tools support thoughtful planning and clearer conversations, never a rushed experience.",
  },
  {
    title: "Comfort is part of the care",
    description:
      "From the first question to your next appointment, we make space for a calm and considered visit.",
  },
];

export function WhyChooseNova() {
  return (
    <section id="why-nova" className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-teal-800 uppercase">
              Why choose Nova Dental
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              A more comfortable way to approach dental care.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {reasons.map((reason) => (
              <article
                key={reason.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-950">{reason.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {reason.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
