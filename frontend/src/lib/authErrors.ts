/**
 * Human-language mapping for backend auth error codes plus the client-side
 * password policy. The frontend NEVER shows raw codes (auth.badCredentials,
 * http 500, …) to visitors.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[0-9][0-9\s().-]{4,24}$/;
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
  key: "length" | "letter" | "number";
  label: string;
  ok: boolean;
}

export function passwordRules(pass: string): PasswordRule[] {
  return [
    { key: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, ok: pass.length >= PASSWORD_MIN_LENGTH },
    { key: "letter", label: "Contains a letter", ok: /[A-Za-z]/.test(pass) },
    { key: "number", label: "Contains a number", ok: /\d/.test(pass) },
  ];
}

export const passwordOk = (pass: string) => passwordRules(pass).every((rule) => rule.ok);

/** 0–4 strength score used by the meter: rules plus length/variety bonuses. */
export function passwordStrength(pass: string): 0 | 1 | 2 | 3 | 4 {
  if (!pass) return 0;
  let score = passwordRules(pass).filter((rule) => rule.ok).length; // 0–3
  if (score === 3 && (pass.length >= 12 || (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) || /[^A-Za-z0-9]/.test(pass))) score = 4;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

export const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;

/** Translate a backend/network error code into a friendly sentence. */
export function describeAuthError(code: string): string {
  if (code === "auth.badCredentials") return "Incorrect email or password.";
  if (code === "auth.emailInUse") return "This email is already registered. Log in instead?";
  if (code === "auth.register") return "We couldn't create your account. Please try again.";
  if (code === "auth.tooManyAttempts" || code === "http 429") return "Too many attempts. Please wait a few minutes and try again.";
  if (code === "request.badBody" || code === "request.tooLarge") return "There was a problem sending your request. Please try again.";
  if (code === "auth.emailNotConfirmed") return "Please confirm your email address before signing in.";
  if (code === "auth.confirmationInvalid") return "This confirmation link is invalid or has already been used.";
  if (code === "auth.resetInvalid") return "This reset link is invalid or has expired. Request a new one below.";
  if (code === "auth.sessionInvalid" || code === "auth.required") return "Your session has expired. Please sign in again.";
  if (code === "validation.failed") return "Please check the highlighted fields and try again.";
  if (code === "net.timeout") return "The server is taking too long to respond. Please try again.";
  if (code === "net.offline" || code === "csrf.unavailable" || /^http 5\d\d$/.test(code))
    return "Can't reach the server right now. Check your connection and try again.";
  if (/^http 4\d\d$/.test(code)) return "The request was rejected. Please check your details and try again.";
  return "Something went wrong. Please try again.";
}
