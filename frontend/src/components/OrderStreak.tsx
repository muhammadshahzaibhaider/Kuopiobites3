"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { apiAccountStreak, apiSubmitWalkInStreak, type OrderStreakStatus } from "@/lib/api";

export default function OrderStreak({ compact = false, walkIn = false }: { compact?: boolean; walkIn?: boolean }) {
  const { user, settings, toast } = useShop();
  const { t, lang } = useLang();
  const cfg = settings.orderStreak;
  const [status, setStatus] = useState<OrderStreakStatus | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const reload = () => {
    if (!user || !cfg?.enabled) { setStatus(null); return; }
    apiAccountStreak().then(setStatus).catch(() => setStatus(null));
  };

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
  const pending = Boolean(status?.pendingClaim);
  const reward = lang === "fi" ? (cfg.rewardNameFi || cfg.rewardNameEn) : (cfg.rewardNameEn || cfg.rewardNameFi);

  const submitWalkIn = async () => {
    if (!user) return;
    setSending(true);
    try {
      await apiSubmitWalkInStreak(note.trim() || undefined);
      setNote("");
      toast(t("streak.walkinSent"));
      reload();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      toast(code === "streak.claimPending" ? t("streak.walkinSent") : t("streak.walkinNeedLogin"), "err");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-3xl border border-gold/40 bg-cream-deep p-6 shadow-card">
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

      {walkIn && !compact && (
        <div className="mt-5 border-t border-gold/30 pt-4">
          <p className="font-black text-cherry">{t("streak.walkin")}</p>
          <p className="mt-1 text-sm font-bold text-cherry/70">{t("streak.walkinBlurb")}</p>
          {!user ? (
            <p className="mt-3 text-sm font-bold text-cherry/70">
              <Link href="/login" className="underline decoration-gold underline-offset-4">{t("streak.walkinNeedLogin")}</Link>
            </p>
          ) : pending ? (
            <p className="mt-3 rounded-2xl bg-gold/20 px-4 py-3 text-sm font-black text-cherry">{t("streak.walkinSent")}</p>
          ) : ready ? null : (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => { e.preventDefault(); void submitWalkIn(); }}
            >
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("streak.walkinNote")}
                className="w-full rounded-2xl border border-cherry/20 bg-cream px-4 py-3 text-sm font-bold"
              />
              <button
                type="submit"
                disabled={sending}
                className="min-h-[48px] w-full rounded-full bg-cherry-bright font-black text-cream hover:bg-cherry disabled:opacity-60"
              >
                {sending ? "…" : t("streak.walkinSend")}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
