"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { RESTAURANT } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { apiSubscribeNewsletter } from "@/lib/api";

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
          <div className="mt-4 flex gap-3">
            <a
              href={RESTAURANT.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-11 w-11 place-items-center rounded-full border border-cream/30 transition hover:bg-cream hover:text-cherry"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2.2c2.7 0 3 0 4.1.1 2.7.1 4.4 1.8 4.5 4.5.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.8 4.4-4.5 4.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4.4-1.8-4.5-4.5-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1C3.5 4.3 5.2 2.6 7.9 2.5c1.1-.1 1.4-.2 4.1-.2Zm0 4.6a5.2 5.2 0 1 0 5.2 5.2A5.2 5.2 0 0 0 12 6.8Zm0 8.6a3.4 3.4 0 1 1 3.4-3.4 3.4 3.4 0 0 1-3.4 3.4Zm5.4-8.8a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2Z"/></svg>
            </a>
            <a
              href={RESTAURANT.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="grid h-11 w-11 place-items-center rounded-full border border-cream/30 transition hover:bg-cream hover:text-cherry"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7Z"/></svg>
            </a>
          </div>
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
                <a href={settings.platforms.wolt} target="_blank" rel="noreferrer" className="font-black text-gold-soft underline decoration-gold underline-offset-4 hover:text-gold">Wolt</a>
              )}
              {settings.platforms.wolt && settings.platforms.uberEats && " · "}
              {settings.platforms.uberEats && (
                <a href={settings.platforms.uberEats} target="_blank" rel="noreferrer" className="font-black text-gold-soft underline decoration-gold underline-offset-4 hover:text-gold">Uber Eats</a>
              )}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-1 text-sm">
            <Link className="hover:text-gold" href="/menu">{t("footer.links")}</Link>
            <Link className="hover:text-gold" href="/dining">{t("footer.book")}</Link>
            <Link className="hover:text-gold" href="/account">{t("nav.account")}</Link>
            <Link className="hover:text-gold" href="/admin">{t("footer.staff")}</Link>
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
              onSubmit={async (e) => {
                e.preventDefault();
                if (!/.+@.+\..+/.test(email)) {
                  toast("Please enter a valid email", "err");
                  return;
                }
                try {
                  await apiSubscribeNewsletter(email);
                  setDone(true);
                  setEmail("");
                } catch (error) {
                  toast((error as Error).message, "err");
                }
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
