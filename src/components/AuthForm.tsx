"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { apiRequestPasswordReset } from "@/lib/api";
import { describeAuthError, EMAIL_RE, PASSWORD_MIN_LENGTH, passwordOk, passwordRules, passwordStrength, PHONE_RE, STRENGTH_LABELS } from "@/lib/authErrors";
import { cx } from "@/lib/format";
import { useShop } from "@/lib/store";
import PasswordInput from "./PasswordInput";

type Mode = "login" | "register" | "forgot";
type FieldKey = "name" | "email" | "phone" | "pass" | "confirm";
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Segmented strength meter + live rules checklist, in the site palette. */
export function PasswordStrength({ pass }: { pass: string }) {
  const score = passwordStrength(pass);
  const colors = ["bg-cherry/15", "bg-cherry-bright", "bg-gold", "bg-gold", "bg-[#2e7d32]"];
  return (
    <div aria-live="polite">
      <div className="mt-2 flex items-center gap-2" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-label={`Password strength: ${STRENGTH_LABELS[score]}`}>
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cx("h-1.5 flex-1 rounded-full transition-colors", pass && i < Math.max(score, 1) ? colors[score] : "bg-cherry/15")} />
          ))}
        </div>
        <span className="text-[11px] font-black uppercase tracking-wide text-cherry/60">{pass ? STRENGTH_LABELS[score] : ""}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {passwordRules(pass).map((rule) => (
          <li key={rule.key} className={cx("flex items-center gap-2 text-xs font-bold", rule.ok ? "text-[#2e7d32]" : "text-cherry/55")}>
            <span aria-hidden="true" className={cx("grid h-4 w-4 place-items-center rounded-full text-[10px]", rule.ok ? "bg-[#2e7d32]/15" : "bg-cherry/10")}>{rule.ok ? "✓" : "·"}</span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AuthForm({ onDone, initialMode = "login" }: { onDone?: () => void; initialMode?: Exclude<Mode, "forgot"> }) {
  const { login, register, toast } = useShop();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", pass: "", confirmPass: "", phone: "", remember: true });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ kind: "error" | "ok"; text: string; resetToken?: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const refs: Record<FieldKey, React.RefObject<HTMLInputElement | null>> = { name: nameRef, email: emailRef, phone: phoneRef, pass: passRef, confirm: confirmRef };

  const set = (patch: Partial<typeof f>) => setF((current) => ({ ...current, ...patch }));
  const switchMode = (next: Mode) => { setMode(next); setErrors({}); setBanner(null); };

  const focusFirstError = (list: FieldErrors) => {
    const first = (["name", "email", "phone", "pass", "confirm"] as FieldKey[]).find((key) => list[key]);
    if (first) refs[first].current?.focus();
  };

  /* Client-side mirror of the store rules. */
  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!EMAIL_RE.test(f.email.trim())) next.email = "Enter a valid email address.";
    if (mode === "register") {
      if (f.name.trim().length < 2) next.name = "Enter your full name.";
      if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) next.phone = "Enter a valid phone number, e.g. +358 44 123 4567.";
      if (!passwordOk(f.pass)) next.pass = `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a letter and a number.`;
      if (f.confirmPass !== f.pass) next.confirm = "Passwords do not match.";
    } else if (mode === "login" && !f.pass) {
      next.pass = "Enter your password.";
    }
    return next;
  };

  const mapError = (code: string): void => {
    if (code === "auth.emailInUse") {
      setErrors({ email: "This email is already registered." });
      setBanner({ kind: "error", text: "This email is already registered. Log in instead?" });
      emailRef.current?.focus();
      return;
    }
    setBanner({ kind: "error", text: describeAuthError(code), });
    if (code === "auth.badCredentials") passRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBanner(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) { focusFirstError(found); return; }
    setBusy(true);
    try {
      if (mode === "forgot") {
        /* Demo store has no SMTP: the reset token comes back directly and is
           shown as a link. Production emails it instead. */
        const token = await apiRequestPasswordReset(f.email.trim()).catch(() => null);
        setBanner({ kind: "ok", text: "If this email is registered, you will receive a reset link shortly.", resetToken: token ?? undefined });
        return;
      }
      const error = mode === "login"
        ? await login(f.email.trim(), f.pass, f.remember)
        : await register({ name: f.name.trim(), email: f.email.trim(), pass: f.pass, phone: f.phone.trim() || undefined });
      if (error) { mapError(error); return; }
      toast(mode === "login" ? "Welcome back! 👋" : "Account created — tervetuloa!");
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  const field = "min-h-[48px] w-full rounded-2xl border bg-cream px-4 text-sm font-bold placeholder:text-cherry/40 focus:border-cherry-bright";
  const fieldCls = (key: FieldKey) => cx(field, errors[key] ? "border-cherry-bright" : "border-cherry/20");
  const describedBy = (key: FieldKey) => (errors[key] ? `auth-err-${key}` : undefined);
  const fieldError = (key: FieldKey) => errors[key] ? <p id={`auth-err-${key}`} className="text-xs font-bold text-cherry-bright">{errors[key]}</p> : null;

  return <div className="rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
    {mode !== "forgot" && <div className="flex rounded-full bg-cream p-1" role="group" aria-label="Choose sign in or create account">
      {(["login", "register"] as const).map((m) => <button type="button" aria-pressed={mode === m} key={m} onClick={() => switchMode(m)} className={cx("relative min-h-[44px] flex-1 rounded-full text-sm font-black capitalize transition", mode === m ? "text-cream" : "text-cherry")}>
        {mode === m && <motion.span layoutId="auth-pill" className="absolute inset-0 rounded-full bg-cherry-bright" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />}<span className="relative">{m === "login" ? "Sign in" : "Create account"}</span>
      </button>)}
    </div>}
    {mode === "forgot" && <button type="button" onClick={() => switchMode("login")} className="text-sm font-black text-cherry-bright underline decoration-gold underline-offset-4 hover:text-cherry">← Back to sign in</button>}

    <form onSubmit={submit} className="mt-5 space-y-3" autoComplete="on" noValidate>
      {mode === "forgot" && <>
        <h2 className="font-display text-xl font-black text-cherry">Reset your password</h2>
        <p className="text-sm text-cherry/70">Enter your account email and we'll send you a secure reset link.</p>
      </>}

      {mode === "register" && <>
        <div>
          <input ref={nameRef} required autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={describedBy("name")} className={fieldCls("name")} placeholder="Full name" value={f.name} onChange={(e) => set({ name: e.target.value })} />
          {fieldError("name")}
        </div>
        <div>
          <input ref={phoneRef} autoComplete="tel" inputMode="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy("phone")} className={fieldCls("phone")} placeholder="Phone (optional), e.g. +358 44 123 4567" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
          {fieldError("phone")}
        </div>
      </>}

      <div>
        <input ref={emailRef} required type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy("email")} className={fieldCls("email")} placeholder="Email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
        {fieldError("email")}
      </div>

      {mode !== "forgot" && <>
        <div>
          <PasswordInput required inputRef={passRef} minLength={mode === "register" ? PASSWORD_MIN_LENGTH : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} aria-invalid={Boolean(errors.pass)} aria-describedby={describedBy("pass")} className={fieldCls("pass")} placeholder="Password" value={f.pass} onChange={(e) => set({ pass: e.target.value })} />
          {fieldError("pass")}
          {mode === "register" && <PasswordStrength pass={f.pass} />}
        </div>
        {mode === "register" && <div>
          <PasswordInput required inputRef={confirmRef} minLength={PASSWORD_MIN_LENGTH} label="Confirm password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} aria-describedby={describedBy("confirm")} className={fieldCls("confirm")} placeholder="Confirm password" value={f.confirmPass} onChange={(e) => set({ confirmPass: e.target.value })} />
          {fieldError("confirm")}
        </div>}
      </>}

      {banner && <div role={banner.kind === "error" ? "alert" : "status"} className={cx("rounded-2xl px-4 py-3 text-sm font-bold", banner.kind === "error" ? "bg-cherry-bright/10 text-cherry-bright" : "bg-[#2e7d32]/10 text-[#2e7d32]")}>
        {banner.text}
        {banner.resetToken && <span className="mt-1 block">Demo mode (no email service): <Link href={`/auth/reset?token=${encodeURIComponent(banner.resetToken)}`} className="font-black underline underline-offset-2">open your reset link</Link></span>}
        {banner.kind === "error" && banner.text.includes("Log in instead") && <button type="button" onClick={() => switchMode("login")} className="mt-1 block font-black underline underline-offset-2">Switch to sign in</button>}
      </div>}

      {mode === "login" && <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-black text-cherry">
          <input type="checkbox" checked={f.remember} onChange={(e) => set({ remember: e.target.checked })} className="h-5 w-5 rounded accent-cherry-bright" />
          Remember me
        </label>
        <button type="button" onClick={() => switchMode("forgot")} className="text-xs font-black text-cherry-bright underline decoration-gold underline-offset-4 hover:text-cherry">Forgot password?</button>
      </div>}

      <button disabled={busy} aria-busy={busy} className="min-h-[48px] w-full rounded-full bg-cherry-bright font-black text-cream transition hover:bg-cherry active:scale-[0.98] disabled:opacity-60">
        {busy ? "One moment…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
      </button>
      {mode !== "forgot" && <p className="text-center text-xs text-cherry/60">Ordering requires an account so we can save your addresses & order history.</p>}
    </form>
  </div>;
}
