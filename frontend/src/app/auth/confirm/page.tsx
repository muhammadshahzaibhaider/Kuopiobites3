"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { apiConfirmEmail } from "@/lib/api";
import { useShop } from "@/lib/store";

function ConfirmInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useShop();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code") || "";
    const tokenHash = params.get("token_hash") || params.get("token") || "";
    const type = params.get("type") || undefined;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const confirmation = code ? { code } as const
      : tokenHash ? { token: tokenHash, type } as const
      : accessToken && refreshToken ? { accessToken, refreshToken } as const
      : null;
    if (!confirmation) { setState("error"); return; }
    apiConfirmEmail(confirmation)
      .then(() => refresh())
      .then(() => {
        setState("ok");
        setTimeout(() => router.replace("/login"), 4000);
      })
      .catch(() => setState("error"));
  }, [params, refresh, router]);

  return (
    <main className="container-x pt-32 pb-16 text-center">
      <div className="mx-auto max-w-lg rounded-3xl border border-cherry/10 bg-cream-deep p-8 shadow-card">
        <h1 className="font-display text-3xl font-black text-cherry">
          {state === "loading" ? "Confirming your email…" : state === "ok" ? "Account created successfully 🎉" : "Confirmation link invalid"}
        </h1>
        <p className="mt-3 text-cherry/70" role={state === "error" ? "alert" : undefined}>
          {state === "ok" ? "You're all set — now sign in to continue. Taking you to the sign-in page in a few seconds…" : state === "error" ? "The link may have expired or already been used. You can request a new one from the sign-in page." : "Please wait a moment."}
        </p>
        {state === "error" && <Link href="/login" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-cherry-bright px-7 font-black text-cream">Back to sign in</Link>}
        {state === "ok" && <Link href="/login" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-cherry-bright px-7 font-black text-cream">Sign in to continue</Link>}
      </div>
    </main>
  );
}

export default function ConfirmPage() {
  return <Suspense fallback={<main className="container-x pt-32 text-center text-cherry/70">Confirming your email…</main>}><ConfirmInner /></Suspense>;
}
