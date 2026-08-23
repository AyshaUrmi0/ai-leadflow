import { LeadForm } from "@/components/landing/lead-form";

export function FinalCTA() {
  return (
    <section id="contact" className="bg-teal-800 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.16em] text-teal-100 uppercase">
            Start with a conversation
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Take the next step with clarity.
          </h2>
          <p className="mt-5 text-lg leading-8 text-teal-50">
            Tell us what you would like to discuss, and the Nova Dental team will help you
            plan a comfortable first conversation.
          </p>
        </div>
        <div className="mt-10">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
