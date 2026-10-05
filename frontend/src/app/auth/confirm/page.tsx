"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiConfirmEmail } from "@/lib/api";

function ConfirmInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const tokenHash = params.get("token_hash") || "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    const session = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = session.get("access_token");
    const refreshToken = session.get("refresh_token");
    const confirmation = accessToken && refreshToken ? { accessToken, refreshToken } : token || tokenHash;
    if (!confirmation) { setState("error"); return; }
    apiConfirmEmail(confirmation).then(() => setState("ok")).catch(() => setState("error"));
  }, [token, tokenHash]);
  return (
    <main className="container-x pt-32 text-center">
      <div className="mx-auto max-w-lg rounded-3xl border border-cherry/10 bg-cream-deep p-8 shadow-card">
        <h1 className="font-display text-3xl font-black text-cherry">
          {state === "loading" ? "Confirming your email…" : state === "ok" ? "Email confirmed" : "Confirmation link invalid"}
        </h1>
        <p className="mt-3 text-cherry/70">
          {state === "ok" ? "You can now sign in and place an order." : state === "error" ? "The link may have expired or already been used." : "Please wait a moment."}
        </p>
        {state !== "loading" && <Link href="/account" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-cherry-bright px-7 font-black text-cream">Go to account</Link>}
      </div>
    </main>
  );
}

export default function ConfirmPage() {
  return <Suspense fallback={<main className="container-x pt-32 text-center">Confirming your email…</main>}><ConfirmInner /></Suspense>;
}
