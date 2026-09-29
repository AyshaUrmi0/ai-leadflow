const patientTestimonials = [
  {
    quote:
      "The consultation felt calm and easy to follow. I appreciated having time to ask questions before deciding on a next step.",
    author: "Sarah M.",
    role: "Consultation Patient",
  },
  {
    quote:
      "Everything was explained clearly, without pressure. It made the whole experience feel much more manageable.",
    author: "David K.",
    role: "Preventive Care",
  },
  {
    quote:
      "The space and communication both felt thoughtful. I left knowing what to expect and how to book my follow-up.",
    author: "Elena R.",
    role: "Restorative Treatment",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.16em] text-teal-800 uppercase">
            Patient experience
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Care that feels clear from the start.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Real experiences and perspectives from patients who value thoughtful, comfortable care.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {patientTestimonials.map((item) => (
            <figure
              key={item.author}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <blockquote className="text-base leading-7 text-slate-700">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-900">
                <span className="font-semibold block">{item.author}</span>
                <span className="text-xs text-slate-500">{item.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
