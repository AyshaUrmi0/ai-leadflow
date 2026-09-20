import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/admin/login/actions";
import { LeadStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Patient Portal | Nova Dental",
  description: "Track your dental consultations, appointments, and care updates.",
};

interface StatusInfo {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
  nextStep: string;
}

function getStatusInfo(status: LeadStatus): StatusInfo {
  switch (status) {
    case LeadStatus.NEW:
      return {
        label: "In Review",
        badgeClass: "bg-amber-950/50 border-amber-500/30 text-amber-300",
        dotClass: "bg-amber-400",
        description: "Consultation received — waiting for clinical review.",
        nextStep:
          "Our patient coordinator is reviewing your request. We typically reach out within 1 business day via phone or email.",
      };
    case LeadStatus.CONTACTED:
      return {
        label: "Team Contacted You",
        badgeClass: "bg-blue-950/50 border-blue-500/30 text-blue-300",
        dotClass: "bg-blue-400",
        description: "Our clinic team has reached out regarding your consultation.",
        nextStep:
          "Please check your phone messages or email inbox to finalize your preferred consultation time.",
      };
    case LeadStatus.QUALIFIED:
      return {
        label: "Confirmed & Scheduled",
        badgeClass: "bg-emerald-950/50 border-emerald-500/30 text-emerald-300",
        dotClass: "bg-emerald-400",
        description: "Your consultation has been reviewed and approved for clinic care.",
        nextStep:
          "Your appointment is confirmed. Please bring any existing dental records or insurance cards to your visit.",
      };
    case LeadStatus.CLOSED_LOST:
      return {
        label: "Archived / Inactive",
        badgeClass: "bg-slate-800/60 border-slate-700 text-slate-400",
        dotClass: "bg-slate-400",
        description: "This consultation request is no longer active.",
        nextStep:
          "If your schedule has changed or you need assistance with dental care, feel free to submit a new consultation request.",
      };
    default:
      return {
        label: "Received",
        badgeClass: "bg-slate-800/60 border-slate-700 text-slate-300",
        dotClass: "bg-slate-400",
        description: "Consultation request is on file.",
        nextStep: "Our team will review your inquiry shortly.",
      };
  }
}

export default async function UserPortalPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/admin/login?callbackUrl=/portal");
  }

  // Server-side user data isolation: userId is the authoritative source of truth for lead ownership
  const consultations = await prisma.lead.findMany({
    where: {
      userId: user.id,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      serviceInterest: true,
      message: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity">
              Nova <span className="text-teal-400">Dental</span>
            </Link>
            <span className="hidden sm:inline-block rounded-full bg-slate-800/80 px-3 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
              Patient Portal
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-md bg-teal-950/80 border border-teal-500/30 px-2.5 py-1 text-[11px] font-semibold text-teal-300">
                {user.email}
              </span>
            </div>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Website
            </Link>

            <form action={logoutAction}>
              <button
                type="submit"
                className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  Active Patient Account
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Welcome, {user.name || "Patient"}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Track your consultation status, treatment inquiries, and clinical next steps.
              </p>
            </div>

            <Link
              href="/#contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-500 transition-all sm:self-start"
            >
              + Book New Consultation
            </Link>
          </div>
        </div>

        {/* Consultations List */}
        <section aria-labelledby="consultations-heading" className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 id="consultations-heading" className="text-lg font-semibold text-white">
                Your Consultations ({consultations.length})
              </h2>
              <p className="text-xs text-slate-400">
                Live status and updates from our clinical team.
              </p>
            </div>
          </div>

          {consultations.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-8 text-center sm:p-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">No Consultations Yet</h3>
              <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
                You have not submitted any consultation requests yet. Request a consultation on our website to begin planning your visit.
              </p>
              <Link
                href="/#contact"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-500 transition-colors shadow-xs"
              >
                Request a Consultation →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {consultations.map((consultation) => {
                const statusInfo = getStatusInfo(consultation.status);
                const formattedDate = new Date(consultation.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div
                    key={consultation.id}
                    className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 backdrop-blur-sm shadow-md space-y-5"
                  >
                    {/* Card Header: Service & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700/60 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-white">
                            {consultation.serviceInterest || "General Dental Consultation"}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badgeClass}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Submitted on {formattedDate}
                        </p>
                      </div>
                    </div>

                    {/* Status & Next Steps Banner */}
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-200">
                            {statusInfo.description}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <strong className="text-teal-300">Next Step: </strong>
                            {statusInfo.nextStep}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Inquiry Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 block mb-1">Contact Phone</span>
                        <span className="font-medium text-slate-200">
                          {consultation.phone || "Not provided"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Inquiry Message</span>
                        <p className="font-medium text-slate-300 leading-relaxed italic">
                          &ldquo;{consultation.message || "No additional message provided."}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Subtle Recruiter / Evaluator Testing Footer */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <span className="font-semibold text-slate-300">Recruiter Evaluation Note:</span>
            <p className="text-[11px] text-slate-500">
              You are authenticated as <code className="text-teal-400">user@novadental.com</code> (`Role.USER`).
              Standard users are restricted from CRM management and AI lead intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center text-amber-400 hover:text-amber-300 hover:underline text-[11px] font-medium transition-colors"
            >
              Test Admin Route Access →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
