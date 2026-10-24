"use client";

import { useState } from "react";
import { CONTACT_BUDGETS, CONTACT_INTERESTS } from "@/lib/content";
import { cn } from "@/lib/cn";
import { ArrowUpRight } from "./icons";

type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  budget: string;
  message: string;
};

const EMPTY: Fields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  service: "",
  budget: "",
  message: "",
};

const fieldClass =
  "h-12 w-full rounded-xl border border-hairline bg-white/[0.03] px-4 text-sm text-fg placeholder:text-muted-dim transition-colors duration-200 hover:border-hairline-strong focus:border-white/35 focus:outline-none";

const labelClass = "mb-2 block text-xxs uppercase tracking-[0.18em] text-muted";

export default function ContactForm() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const update = (key: keyof Fields) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFields((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof Fields, string>> = {};
    if (!fields.firstName.trim()) next.firstName = "Required";
    if (!fields.lastName.trim()) next.lastName = "Required";
    if (!fields.email.trim()) next.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email)) next.email = "Enter a valid email";
    if (!fields.phone.trim()) next.phone = "Required";
    if (!fields.service) next.service = "Select a service";
    if (!fields.budget) next.budget = "Select a budget";
    if (fields.message.trim().length < 20) next.message = "Tell us a little more (20+ characters)";
    return next;
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstKey = Object.keys(next)[0];
      document.getElementById(`contact-${firstKey}`)?.focus();
      return;
    }
    setStatus("sending");
    /* Stub: swap for a POST to your form endpoint. */
    window.setTimeout(() => setStatus("sent"), 900);
  };

  if (status === "sent") {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-4 rounded-card border border-hairline bg-white/[0.03] p-8 sm:p-10"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink">
          <ArrowUpRight className="h-5 w-5" />
        </span>
        <h2 className="text-2xl font-medium tracking-tight text-fg">Message received.</h2>
        <p className="max-w-md text-sm leading-relaxed text-muted">
          Thanks, {fields.firstName}. We reply to every serious enquiry within 48 hours. If it is
          urgent, email us directly and we will pick it up sooner.
        </p>
        <button
          type="button"
          onClick={() => {
            setFields(EMPTY);
            setStatus("idle");
          }}
          className="mt-2 text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-fg"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="contact-firstName"
          label="First name"
          error={errors.firstName}
          value={fields.firstName}
          onChange={update("firstName")}
          autoComplete="given-name"
        />
        <Field
          id="contact-lastName"
          label="Last name"
          error={errors.lastName}
          value={fields.lastName}
          onChange={update("lastName")}
          autoComplete="family-name"
        />
        <Field
          id="contact-email"
          label="Email"
          type="email"
          error={errors.email}
          value={fields.email}
          onChange={update("email")}
          autoComplete="email"
        />
        <Field
          id="contact-phone"
          label="Phone number"
          type="tel"
          error={errors.phone}
          value={fields.phone}
          onChange={update("phone")}
          autoComplete="tel"
        />
        <div>
          <label htmlFor="contact-service" className={labelClass}>
            Service interested in
          </label>
          <select
            id="contact-service"
            className={cn(fieldClass, "appearance-none bg-ink-soft")}
            value={fields.service}
            onChange={update("service")}
            aria-invalid={Boolean(errors.service)}
            aria-describedby={errors.service ? "contact-service-error" : undefined}
          >
            <option value="">Select service…</option>
            {CONTACT_INTERESTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError id="contact-service-error" message={errors.service} />
        </div>
        <div>
          <label htmlFor="contact-budget" className={labelClass}>
            Project budget
          </label>
          <select
            id="contact-budget"
            className={cn(fieldClass, "appearance-none bg-ink-soft")}
            value={fields.budget}
            onChange={update("budget")}
            aria-invalid={Boolean(errors.budget)}
            aria-describedby={errors.budget ? "contact-budget-error" : undefined}
          >
            <option value="">Select budget…</option>
            {CONTACT_BUDGETS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError id="contact-budget-error" message={errors.budget} />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="contact-message"
          rows={5}
          className={cn(fieldClass, "h-auto resize-y py-3 leading-relaxed")}
          placeholder="What are you building, and what would success look like?"
          value={fields.message}
          onChange={update("message")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
        />
        <FieldError id="contact-message-error" message={errors.message} />
      </div>

      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === "sending"}
          className="group/pill inline-flex h-12 items-center gap-3 rounded-full bg-white pl-6 pr-2.5 text-sm font-medium text-ink transition-[box-shadow,transform] duration-300 ease-expo hover:-translate-y-0.5 hover:shadow-pill disabled:translate-y-0 disabled:opacity-70"
        >
          {status === "sending" ? "Sending…" : "Send Message"}
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover/pill:translate-x-0.5 group-hover/pill:-translate-y-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
          </span>
        </button>
        <p className="text-xxs leading-relaxed text-muted-dim">
          We reply within 48 hours. No newsletters, no CRM drip.
        </p>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  type = "text",
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  type?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={fieldClass}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xxs text-[#fca5a5]">
      {message}
    </p>
  );
}
