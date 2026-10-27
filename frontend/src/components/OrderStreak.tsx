"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { apiAccountStreak, type OrderStreakStatus } from "@/lib/api";

export default function OrderStreak({ compact = false }: { compact?: boolean }) {
  const { user, settings } = useShop();
  const { t, lang } = useLang();
  const cfg = settings.orderStreak;
  const [status, setStatus] = useState<OrderStreakStatus | null>(null);

  useEffect(() => {
    if (!user || !cfg?.enabled) { setStatus(null); return; }
    let live = true;
    apiAccountStreak().then((row) => { if (live) setStatus(row); }).catch(() => { if (live) setStatus(null); });
    return () => { live = false; };
  }, [user, cfg?.enabled]);

  if (!cfg?.enabled) return null;

  const target = cfg.target || 7;
  const count = status?.count ?? 0;
  const ready = Boolean(status?.rewardReady);
  const reward = lang === "fi" ? (cfg.rewardNameFi || cfg.rewardNameEn) : (cfg.rewardNameEn || cfg.rewardNameFi);

  return (
    <section className={`rounded-3xl border border-gold/40 bg-cream-deep p-6 shadow-card ${compact ? "" : ""}`}>
      <p className="font-script text-xl text-gold-deep -rotate-1">{t("streak.kicker")}</p>
      <h3 className="font-display text-2xl font-black text-cherry">{t("streak.title")}</h3>
      <p className="mt-2 text-sm font-bold text-cherry/70">
        {ready ? t("streak.ready").replace("{item}", reward) : t("streak.blurb").replace("{n}", String(target)).replace("{item}", reward)}
      </p>
      <ol className="mt-5 flex flex-wrap gap-2" aria-label={t("streak.title")}>
        {Array.from({ length: target }, (_, i) => {
          const filled = i < count || ready;
          return (
            <li
              key={i}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-black ${filled ? "border-gold bg-gold text-cherry" : "border-cherry/15 bg-cream text-cherry/35"}`}
              aria-current={i === count && !ready ? "step" : undefined}
            >
              {i + 1}
            </li>
          );
        })}
      </ol>
      {!user && (
        <p className="mt-4 text-sm font-bold text-cherry/70">
          <Link href="/login" className="underline decoration-gold underline-offset-4">{t("streak.signin")}</Link>
        </p>
      )}
      {user && ready && (
        <p className="mt-4 text-sm font-black text-cherry">
          {t("streak.redeemHint")} <Link href="/order" className="underline decoration-gold underline-offset-4">{t("streak.checkout")}</Link>
        </p>
      )}
      {user && !ready && (
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-cherry/50">{count}/{target}</p>
      )}
    </section>
  );
}
