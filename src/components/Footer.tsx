"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { RESTAURANT } from "@/lib/menu";
import { useShop } from "@/lib/store";
import SocialLinks from "./SocialLinks";

export default function Footer() {
  const { settings, toast } = useShop();
  const { t, dayName } = useLang();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <footer className="mt-20 bg-cherry-deep text-cream">
      <div className="gold-rule opacity-60" />
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-16 w-16 rounded-full border-2 border-gold object-cover" />
          <p className="mt-3 font-display text-2xl font-black">Kuopio Bites</p>
          <p className="font-script text-xl text-gold-soft">& Asian cuisine</p>
          <p className="mt-3 text-sm text-cream/80">
            Grilli · Pizzeria · South Asian & Asian kitchen — made fresh in Kuopio.
          </p>
          <SocialLinks className="mt-4" />
        </div>

        <div>
          <h3 className="font-display text-lg font-black text-gold-soft">{t("footer.hours")}</h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <li key={d} className="flex justify-between gap-6 text-cream/85">
                <span>{dayName(d)}</span>
                <span className="font-bold tabular-nums">
                  {settings.hours[d] ? `${settings.hours[d]!.open} – ${settings.hours[d]!.close}` : t("hours.closed")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg font-black text-gold-soft">{t("footer.find")}</h3>
          <address className="mt-3 not-italic text-sm text-cream/85">
            {RESTAURANT.address}
            <br />
            Finland
          </address>
          <a href={RESTAURANT.phoneHref} className="mt-2 block text-lg font-black text-gold-soft hover:text-gold">
            {RESTAURANT.phone}
          </a>
          <a href={RESTAURANT.mapLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline decoration-gold underline-offset-4 hover:text-gold">
            {t("home.dirs")}
          </a>
          {(settings.platforms.wolt || settings.platforms.uberEats) && (
            <p className="mt-4 text-sm text-cream/70">
              {t("order.platforms")}:{" "}
              {settings.platforms.wolt && (
                <a href={settings.platforms.wolt} target="_blank" rel="noopener noreferrer" className="font-black text-gold-soft underline decoration-gold underline-offset-4 hover:text-gold">Wolt</a>
              )}
              {settings.platforms.wolt && settings.platforms.uberEats && " · "}
              {settings.platforms.uberEats && (
                <a href={settings.platforms.uberEats} target="_blank" rel="noopener noreferrer" className="font-black text-gold-soft underline decoration-gold underline-offset-4 hover:text-gold">Uber Eats</a>
              )}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-1 text-sm">
            <Link className="hover:text-gold" href="/menu">{t("footer.links")}</Link>
            <Link className="hover:text-gold" href="/dining">{t("footer.book")}</Link>
            <Link className="hover:text-gold" href="/account">{t("nav.account")}</Link>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-black text-gold-soft">{t("footer.news")}</h3>
          <p className="mt-3 text-sm text-cream/80">{t("footer.newsNote")}</p>
          {done ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl bg-gold/20 px-4 py-3 text-sm font-bold text-gold-soft"
            >
              {t("footer.thanks")}
            </motion.p>
          ) : (
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!/.+@.+\..+/.test(email)) {
                  toast("Please enter a valid email", "err");
                  return;
                }
                // STUB → POST /api/newsletter (persist locally until newsletter administration is wired)
                try {
                  const raw = localStorage.getItem("kb_newsletter");
                  const list: { email: string; at: number }[] = raw ? JSON.parse(raw) : [];
                  if (!list.some((x) => x.email === email)) list.push({ email, at: Date.now() });
                  localStorage.setItem("kb_newsletter", JSON.stringify(list));
                } catch {}
                setDone(true);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.fi"
                className="min-h-[44px] w-full rounded-full border border-cream/30 bg-cherry px-4 text-sm text-cream placeholder:text-cream/50 focus:border-gold"
              />
              <button className="min-h-[44px] rounded-full bg-gold px-5 font-black text-cherry-dark transition hover:bg-gold-soft active:scale-95">
                {t("footer.join")}
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="border-t border-cream/15 py-5 text-center text-xs text-cream/60">
        © {new Date().getFullYear()} Kuopio Bites · {RESTAURANT.address} · {t("footer.vat")}
      </div>
    </footer>
  );
}
