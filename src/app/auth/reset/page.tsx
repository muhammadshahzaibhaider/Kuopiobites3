"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { PasswordStrength } from "@/components/AuthForm";
import { apiResetPassword } from "@/lib/api";
import { describeAuthError, PASSWORD_MIN_LENGTH, passwordOk } from "@/lib/authErrors";
import { useShop } from "@/lib/store";

function ResetInner() {
  const params = useSearchParams();
  const { toast, logout } = useShop();
  const token = params.get("token") || "";
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  /* A successful reset invalidates sessions (matches the production flow). */
  useEffect(() => { if (done) logout(); }, [done, logout]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !token) return;
    if (!passwordOk(pass)) { setErr(`Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a letter and a number.`); passRef.current?.focus(); return; }
    if (pass !== confirm) { setErr("Passwords do not match."); return; }
    setErr(null);
    setBusy(true);
    try {
      const error = await apiResetPassword(token, pass);
      if (error) { setErr(describeAuthError(error)); return; }
      setDone(true);
      toast("Password updated ✅");
    } finally {
      setBusy(false);
    }
  };

  const field = "min-h-[48px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold placeholder:text-cherry/40 focus:border-cherry-bright";
  return (
    <main className="container-x pt-32 pb-16 text-center">
      <div className="mx-auto max-w-lg rounded-3xl border border-cherry/10 bg-cream-deep p-8 text-left shadow-card">
        {done ? <>
          <h1 className="font-display text-3xl font-black text-cherry">Password updated</h1>
          <p className="mt-3 text-cherry/70">Your password has been changed and you were signed out. Sign in with your new password.</p>
          <Link href="/login" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-cherry-bright px-7 font-black text-cream">Sign in</Link>
        </> : !token ? <>
          <h1 className="font-display text-3xl font-black text-cherry">Reset link invalid</h1>
          <p className="mt-3 text-cherry/70">The link may have expired or already been used. Request a fresh one from the sign-in page.</p>
          <Link href="/login" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-cherry-bright px-7 font-black text-cream">Back to sign in</Link>
        </> : <>
          <h1 className="font-display text-3xl font-black text-cherry">Choose a new password</h1>
          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            <PasswordInput required inputRef={passRef} minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" label="New password" className={field} placeholder="New password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <PasswordStrength pass={pass} />
            <PasswordInput required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" label="Confirm new password" className={field} placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {err && <p role="alert" className="text-sm font-bold text-cherry-bright">{err}</p>}
            <button disabled={busy} aria-busy={busy} className="min-h-[48px] w-full rounded-full bg-cherry-bright font-black text-cream transition hover:bg-cherry disabled:opacity-60">
              {busy ? "One moment…" : "Update password"}
            </button>
          </form>
        </>}
      </div>
    </main>
  );
}

export default function ResetPage() {
  return <Suspense fallback={<main className="container-x pt-32 text-center text-cherry/70">Loading…</main>}><ResetInner /></Suspense>;
}
