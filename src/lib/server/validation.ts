import { z } from "zod";

/**
 * Server-side validation for contact inquiries.
 * Separated from UI components so both client preview and API route share the same schema.
 */
export const contactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name is too long")
    .regex(/^[\p{L}\s'.-]+$/u, "First name contains invalid characters"),
  lastName: z
    .string()
    .trim()
    .max(80, "Last name is too long")
    .regex(/^[\p{L}\s'.-]*$/u, "Last name contains invalid characters")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(254, "Email is too long")
    .email("Please provide a valid email address")
    .toLowerCase(),
  company: z.string().trim().max(120, "Company name is too long").optional().or(z.literal("")),
  service: z.string().trim().min(1, "Please select a service area").max(80),
  budget: z.string().trim().max(40).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(15, "Please provide at least 15 characters describing your project")
    .max(5000, "Message is too long — please keep it under 5000 characters"),
  // Abuse protection fields
  botField: z.string().max(1000).optional().or(z.literal("")),
  formLoadedAt: z.number().int().positive().optional(),
  website: z.string().max(500).optional().or(z.literal("")), // alt honeypot
});

export type ContactInput = z.infer<typeof contactSchema>;

// Simple email allowlist check for obviously disposable or malformed cases is handled by z.email().
// Additional checks like MX lookups are out of scope for this demo; production should use a
// dedicated email verification service if needed.
