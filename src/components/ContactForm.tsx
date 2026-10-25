"use client";

import React, { useState, useEffect } from "react";
import { servicesData } from "@/data/services";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  service: string;
  budget: string;
  message: string;
  botField: string; // honeypot
  website: string; // alt honeypot
}

interface FormErrors {
  firstName?: string;
  email?: string;
  service?: string;
  message?: string;
  general?: string;
}

export default function ContactForm({ defaultService }: { defaultService?: string }) {
  const [formData, setFormData] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    service: defaultService || "",
    budget: "$25k - $50k",
    message: "",
    botField: "",
    website: "",
  });
  const [formLoadedAt, setFormLoadedAt] = useState<number>(Date.now());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<null | { delivered: boolean; message: string }>(null);

  useEffect(() => {
    setFormLoadedAt(Date.now());
  }, []);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.email.trim()) newErrors.email = "Work email is required";
    else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.email)) newErrors.email = "Please enter a valid email address";
    if (!formData.service) newErrors.service = "Please select a service area";
    if (!formData.message.trim() || formData.message.length < 15) newErrors.message = "Please provide at least 15 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          company: formData.company,
          service: formData.service,
          budget: formData.budget,
          message: formData.message,
          botField: formData.botField,
          website: formData.website,
          formLoadedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // API now honestly reports whether lead was delivered or just logged/previewed
        const delivered = Boolean((data as any).delivered);
        const message =
          (data as any).message ||
          (delivered ? "Your inquiry was delivered to our lead destination." : "Your inquiry was received — delivery depends on lead destination configuration. Preview mode: not auto-delivered.");
        setResult({ delivered, message });
        if (res.ok) {
          // Only clear sensitive fields, keep for correction if undelivered
          if (delivered) {
            setFormData({
              firstName: "",
              lastName: "",
              email: "",
              company: "",
              service: defaultService || "",
              budget: "$25k - $50k",
              message: "",
              botField: "",
              website: "",
            });
          }
        }
        setErrors({});
      } else {
        const msg = (data as any).error || (data as any).message || "Submission failed. Please retry.";
        setErrors({ general: msg });
      }
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="py-10 text-center animate-fade-in">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border ${result.delivered ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}
        >
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{result.delivered ? "Inquiry Delivered" : "Inquiry Logged — Preview Mode"}</h3>
        <p className="text-zinc-400 text-sm max-w-md mx-auto mb-2">{result.message}</p>
        {!result.delivered && (
          <p className="text-[11px] font-mono text-amber-300/80 max-w-md mx-auto mb-6 border border-amber-500/20 bg-amber-500/10 rounded-lg px-3 py-2">
            No lead destination is configured on this deployment (set <code>CONTACT_WEBHOOK_URL</code> or <code>RESEND_API_KEY</code>). For this demo, the message is validated and logged but not forwarded.
          </p>
        )}
        <button
          type="button"
          onClick={() => setResult(null)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/[0.08] hover:bg-white/[0.15] text-white transition-colors"
        >
          {result.delivered ? "Submit Another Inquiry" : "Edit & Resubmit"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Honeypot fields - hidden */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="botField">Leave blank</label>
        <input id="botField" name="botField" type="text" value={formData.botField} onChange={(e) => setFormData({ ...formData, botField: e.target.value })} tabIndex={-1} autoComplete="off" />
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-xs font-mono uppercase text-zinc-400 mb-2">
            First Name *
          </label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Avery"
            className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors ${errors.firstName ? "border-rose-500/60 focus:border-rose-500" : "border-white/10 focus:border-brand-primary"}`}
          />
          {errors.firstName && (
            <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.firstName}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-xs font-mono uppercase text-zinc-400 mb-2">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Quinn"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="email" className="block text-xs font-mono uppercase text-zinc-400 mb-2">
            Work Email *
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="avery@company.com"
            className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border text-sm text-white placeholder-zinc-600 focus:outline-none ${errors.email ? "border-rose-500/60 focus:border-rose-500" : "border-white/10 focus:border-brand-primary"}`}
          />
          {errors.email && (
            <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="company" className="block text-xs font-mono uppercase text-zinc-400 mb-2">
            Company
          </label>
          <input
            id="company"
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Example Co."
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      <div>
        <label htmlFor="service" className="block text-xs font-mono uppercase text-zinc-400 mb-2">
          Primary Area of Need *
        </label>
        <select
          id="service"
          value={formData.service}
          onChange={(e) => setFormData({ ...formData, service: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl bg-[#0c0c11] border text-sm text-white focus:outline-none ${errors.service ? "border-rose-500/60 focus:border-rose-500" : "border-white/10 focus:border-brand-primary"}`}
        >
          <option value="">Select a discipline...</option>
          {servicesData.map((s) => (
            <option key={s.id} value={s.title}>
              {s.title} ({s.badge})
            </option>
          ))}
        </select>
        {errors.service && (
          <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.service}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">Estimated Investment</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["< $25k", "$25k - $50k", "$50k - $100k", "$100k+"].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setFormData({ ...formData, budget: tier })}
              className={`py-2.5 px-3 rounded-xl text-xs font-mono border transition-all ${formData.budget === tier ? "bg-brand-primary/20 border-brand-primary text-white" : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:border-white/20"}`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-mono uppercase text-zinc-400 mb-2">
          Project Parameters &amp; Objectives *
        </label>
        <textarea
          id="message"
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Outline current hurdles, timeline, or integrations..."
          className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border text-sm text-white placeholder-zinc-600 focus:outline-none ${errors.message ? "border-rose-500/60 focus:border-rose-500" : "border-white/10 focus:border-brand-primary"}`}
        />
        {errors.message && (
          <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.message}
          </p>
        )}
      </div>

      {errors.general && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errors.general}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-brand-primary hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-xl shadow-brand-primary/25"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Transmitting...
          </>
        ) : (
          <>
            <span>Submit Inquiry</span> <Send className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-[11px] font-mono text-zinc-500 text-center">
        By submitting, you agree to our Terms. We do NOT claim delivery unless a lead destination is configured — see status above after submit.
      </p>
    </form>
  );
}
