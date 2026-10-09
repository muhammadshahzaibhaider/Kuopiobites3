"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { cx } from "@/lib/format";
import { useShop } from "@/lib/store";
import PasswordInput from "./PasswordInput";

export default function AuthForm({ onDone }: { onDone?: () => void }) {
  const { login, register, toast } = useShop();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", pass: "", confirmPass: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (mode === "register") {
      if (f.pass.length < 12) { setErr("Password must be at least 12 characters."); return; }
      if (f.pass !== f.confirmPass) { setErr("Passwords do not match."); return; }
    }
    setBusy(true);
    const error = mode === "login" ? await login(f.email, f.pass) : await register({ name: f.name, email: f.email, pass: f.pass, phone: f.phone });
    setBusy(false);
    if (error) setErr(error);
    else { toast(mode === "login" ? "Welcome back! 👋" : "Account created — tervetuloa!"); onDone?.(); }
  };

  const field = "min-h-[48px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold placeholder:text-cherry/40 focus:border-cherry-bright";
  return (
    <div className="rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
      <div className="flex rounded-full bg-cream p-1">
        {(["login", "register"] as const).map((m) => <button type="button" key={m} onClick={() => { setMode(m); setErr(null); }} className={cx("relative min-h-[44px] flex-1 rounded-full text-sm font-black capitalize transition", mode === m ? "text-cream" : "text-cherry")}>
          {mode === m && <motion.span layoutId="auth-pill" className="absolute inset-0 rounded-full bg-cherry-bright" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />}
          <span className="relative">{m === "login" ? "Sign in" : "Create account"}</span>
        </button>)}
      </div>
      <form onSubmit={submit} className="mt-5 space-y-3" autoComplete="on">
        {mode === "register" && <><input required autoComplete="name" className={field} placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><input autoComplete="tel" className={field} placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></>}
        <input required type="email" autoComplete="email" className={field} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <PasswordInput required minLength={mode === "register" ? 12 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} className={field} placeholder={mode === "register" ? "Password (12+ characters)" : "Password"} value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} />
        {mode === "register" && <PasswordInput required minLength={12} label="Confirm password" autoComplete="new-password" className={field} placeholder="Confirm password" value={f.confirmPass} onChange={(e) => setF({ ...f, confirmPass: e.target.value })} />}
        {err && <p role="alert" className="text-sm font-bold text-cherry-bright">{err}</p>}
        <button disabled={busy} className="min-h-[48px] w-full rounded-full bg-cherry-bright font-black text-cream transition hover:bg-cherry active:scale-[0.98] disabled:opacity-60">{busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}</button>
        <p className="text-center text-xs text-cherry/60">Ordering requires an account so we can save your addresses & order history.</p>
      </form>
    </div>
  );
}
