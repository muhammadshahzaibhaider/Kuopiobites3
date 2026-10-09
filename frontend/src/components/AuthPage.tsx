"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import AuthForm from "@/components/AuthForm";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";

/** Only allow internal redirect targets — never http(s) or protocol-relative URLs. */
export function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("://")) return raw;
  return "/account";
}

/** Centered sign-in / create-account card with redirect-back support. */
export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const params = useSearchParams();
  const router = useRouter();
  const { user, authChecked } = useShop();
  const { t } = useLang();
  const next = safeNextPath(params.get("next"));
  const isLogin = mode === "login";

  /* Already signed in? /login and /signup are only for guests. */
  useEffect(() => {
    if (authChecked && user) router.replace(next);
  }, [authChecked, user, next, router]);

  return (
    <div className="container-x max-w-md pt-28 pb-16 sm:pt-32">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-script text-2xl text-gold-deep -rotate-1">{t("acct.welcome")}</p>
        <h1 className="text-4xl font-black text-cherry">{t(isLogin ? "auth.loginTitle" : "auth.signupTitle")}</h1>
        <div className="gold-rule mt-4 w-24" />
        <p className="mt-4 text-sm text-cherry/70">{t(isLogin ? "auth.loginBlurb" : "auth.signupBlurb")}</p>
      </motion.div>
      <div className="mt-6">
        <AuthForm initialMode={mode} onDone={() => router.replace(next)} />
      </div>
      <p className="mt-5 text-center text-sm font-bold text-cherry/70">
        {t(isLogin ? "auth.noAccount" : "auth.haveAccount")}{" "}
        <Link href={isLogin ? `/signup?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`} className="font-black text-cherry-bright underline decoration-gold underline-offset-4 hover:text-cherry">
          {t(isLogin ? "auth.signup" : "auth.login")}
        </Link>
      </p>
    </div>
  );
}
