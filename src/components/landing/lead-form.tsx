"use client";

import { useState, type FormEvent } from "react";
import { leadSchema, serviceInterestOptions, type LeadInput } from "@/lib/validations/lead";

type FormStatus = "idle" | "submitting" | "success" | "error";

const initialFormState: LeadInput = {
  name: "",
  email: "",
  phone: "",
  serviceInterest: undefined,
  message: "",
  consentGiven: true,
};

export function LeadForm() {
  const [formData, setFormData] = useState<LeadInput>(initialFormState);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const isSubmitting = status === "submitting";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const name = target.name;
    const value =
      target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    setFieldErrors({});
    setServerError(null);

    // Client-side validation using leadSchema
    const clientValidation = leadSchema.safeParse(formData);

    if (!clientValidation.success) {
      const flattened = clientValidation.error.flatten().fieldErrors;
      setFieldErrors(flattened);
      setStatus("idle");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientValidation.data),
      });

      let responseData: { success?: boolean; message?: string; errors?: Record<string, string[]> } = {};

      try {
        responseData = await response.json();
      } catch {
        // Response was not valid JSON
      }

      if (response.status === 201 && responseData.success) {
        setStatus("success");
        setFormData({
          name: "",
          email: "",
          phone: "",
          serviceInterest: undefined,
          message: "",
          consentGiven: true,
        });
      } else if (response.status === 400 && responseData.errors) {
        setFieldErrors(responseData.errors);
        setServerError(responseData.message || "Please fix the highlighted errors below.");
        setStatus("error");
      } else {
        setServerError("Something went wrong. Please try again later.");
        setStatus("error");
      }
    } catch {
      setServerError("Something went wrong. Please try again later.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setFieldErrors({});
    setServerError(null);
    setFormData(initialFormState);
  };

  if (status === "success") {
    return (
      <div
        className="rounded-xl border border-teal-200 bg-teal-50 p-6 text-center shadow-sm sm:p-8"
        aria-live="polite"
        role="status"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 text-white">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-4 text-xl font-semibold text-teal-950">Consultation Request Received</h3>
        <p className="mt-2 text-base leading-relaxed text-teal-900">
          Thank you! Your consultation request has been received. We will reach out shortly.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm sm:p-8"
    >
      {serverError && (
        <div
          className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
          aria-live="polite"
        >
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Name Field */}
        <div className="sm:col-span-1">
          <label htmlFor="name" className="block text-sm font-medium text-slate-900">
            Full Name <span className="text-teal-700" aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            disabled={isSubmitting}
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Jane Doe"
            className="mt-2 block w-full min-h-11 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:opacity-60"
          />
          {fieldErrors.name && (
            <p id="name-error" className="mt-1.5 text-sm font-medium text-red-600">
              {fieldErrors.name.join(", ")}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="sm:col-span-1">
          <label htmlFor="email" className="block text-sm font-medium text-slate-900">
            Email Address <span className="text-teal-700" aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            disabled={isSubmitting}
            value={formData.email}
            onChange={handleChange}
            placeholder="jane@example.com"
            className="mt-2 block w-full min-h-11 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:opacity-60"
          />
          {fieldErrors.email && (
            <p id="email-error" className="mt-1.5 text-sm font-medium text-red-600">
              {fieldErrors.email.join(", ")}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div className="sm:col-span-1">
          <label htmlFor="phone" className="block text-sm font-medium text-slate-900">
            Phone Number <span className="text-xs font-normal text-slate-500">(optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
            disabled={isSubmitting}
            value={formData.phone || ""}
            onChange={handleChange}
            placeholder="(555) 000-0000"
            className="mt-2 block w-full min-h-11 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:opacity-60"
          />
          {fieldErrors.phone && (
            <p id="phone-error" className="mt-1.5 text-sm font-medium text-red-600">
              {fieldErrors.phone.join(", ")}
            </p>
          )}
        </div>

        {/* Service Interest Field */}
        <div className="sm:col-span-1">
          <label htmlFor="serviceInterest" className="block text-sm font-medium text-slate-900">
            Service Interest <span className="text-xs font-normal text-slate-500">(optional)</span>
          </label>
          <select
            id="serviceInterest"
            name="serviceInterest"
            aria-invalid={Boolean(fieldErrors.serviceInterest)}
            aria-describedby={fieldErrors.serviceInterest ? "serviceInterest-error" : undefined}
            disabled={isSubmitting}
            value={formData.serviceInterest || ""}
            onChange={handleChange}
            className="mt-2 block w-full min-h-11 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:opacity-60"
          >
            <option value="">Select a service interest...</option>
            {serviceInterestOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {fieldErrors.serviceInterest && (
            <p id="serviceInterest-error" className="mt-1.5 text-sm font-medium text-red-600">
              {fieldErrors.serviceInterest.join(", ")}
            </p>
          )}
        </div>

        {/* Message Field */}
        <div className="sm:col-span-2">
          <label htmlFor="message" className="block text-sm font-medium text-slate-900">
            How can we help you? <span className="text-xs font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={fieldErrors.message ? "message-error" : undefined}
            disabled={isSubmitting}
            value={formData.message || ""}
            onChange={handleChange}
            placeholder="Tell us about what you would like to discuss during your visit..."
            className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 disabled:opacity-60"
          />
          {fieldErrors.message && (
            <p id="message-error" className="mt-1.5 text-sm font-medium text-red-600">
              {fieldErrors.message.join(", ")}
            </p>
          )}
        </div>

        {/* Consent Checkbox */}
        <div className="sm:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-6 items-center">
              <input
                type="checkbox"
                id="consentGiven"
                name="consentGiven"
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.consentGiven)}
                aria-describedby={fieldErrors.consentGiven ? "consentGiven-error" : undefined}
                disabled={isSubmitting}
                checked={Boolean(formData.consentGiven)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700 disabled:opacity-60"
              />
            </div>
            <label htmlFor="consentGiven" className="text-sm leading-6 text-slate-700">
              I agree to be contacted by Nova Dental regarding my consultation request.{" "}
              <span className="text-teal-700" aria-hidden="true">*</span>
            </label>
          </div>
          {fieldErrors.consentGiven && (
            <p id="consentGiven-error" className="mt-1.5 text-sm font-medium text-red-600">
              {fieldErrors.consentGiven.join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-teal-700 px-6 text-base font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <svg
                className="-ml-1 mr-2.5 h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Submitting...
            </>
          ) : (
            "Request consultation"
          )}
        </button>
      </div>
    </form>
  );
}
