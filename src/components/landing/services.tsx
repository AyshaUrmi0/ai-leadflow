const services = [
  {
    title: "Preventive care",
    description:
      "Routine check-ins and practical guidance to help you stay on top of everyday dental care.",
  },
  {
    title: "Restorative care",
    description:
      "Thoughtful options for dental concerns, explained in clear and approachable language.",
  },
  {
    title: "Cosmetic consultations",
    description:
      "A considered conversation about your goals and options that may be appropriate for you.",
  },
];

export function Services() {
  return (
    <section id="services" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.16em] text-teal-800 uppercase">
            Our services
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Care built around everyday confidence.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            We focus on clear conversations and a calm experience, whether you are
            visiting for routine care or exploring options.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div
                className="flex size-10 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-800"
                aria-hidden="true"
              >
                ND
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                {service.title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">{service.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
