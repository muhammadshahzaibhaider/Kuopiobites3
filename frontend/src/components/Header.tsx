"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { OpenBadge } from "./ui";

const LINKS = [
  { href: "/", key: "nav.home" },
  { href: "/menu", key: "nav.menu" },
  { href: "/order", key: "nav.order" },
  { href: "/dining", key: "nav.dining" },
  { href: "/about", key: "nav.about" },
];

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-full border border-cream/40 p-0.5" role="group" aria-label="Language">
      {(["en", "fi"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cx(
            "min-h-[32px] rounded-full px-2.5 text-xs font-black uppercase tracking-wide transition",
            lang === l ? "bg-gold text-cherry-dark" : "text-cream/80 hover:text-cream"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { cartCount, pulse, setCartOpen, user, settings, logout } = useShop();
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setOpen(false); setAccountOpen(false); }, [pathname]);

  /* Close the account dropdown on outside pointer / Escape. */
  useEffect(() => {
    if (!accountOpen) return;
    const onPointer = (e: PointerEvent) => { if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAccountOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [accountOpen]);

  return (
    <>
      <header
        className={cx(
          "fixed inset-x-0 top-0 z-40 transition-all duration-300",
          scrolled ? "bg-cherry-deep/95 shadow-lift backdrop-blur-md" : "bg-cherry-deep"
        )}
      >
        <div className="container-x flex h-16 sm:h-20 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Kuopio Bites home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.headerLogo === "mark" ? "/brand/pizza-mark.png" : "/logo.png"}
              alt="Kuopio Bites logo"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-gold/70 object-cover bg-cream"
            />
            <span className="hidden sm:block leading-none">
              <span className="block whitespace-nowrap font-display text-lg font-black tracking-tight text-cream">
                Kuopio Bites
              </span>
              <span className="block font-script text-base text-gold-soft">
                & Asian cuisine
              </span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cx(
                    "relative rounded-full px-4 py-2 text-sm font-bold transition-colors",
                    active ? "text-cherry-dark" : "text-cream/90 hover:text-gold-soft"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-gold"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                  )}
                  <span className="relative">{t(l.key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden xl:block">
              <OpenBadge />
            </span>
            <LangToggle />
            {user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((current) => !current)}
                  aria-label={`${t("nav.account")} — ${user.name}`}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  className="relative grid h-11 w-11 place-items-center rounded-full border border-gold bg-cream text-cherry transition hover:bg-gold-soft active:scale-90"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.2c-4 0-7.5 2-7.5 4.6V21h15v-2.2c0-2.6-3.5-4.6-7.5-4.6Z" />
                  </svg>
                </button>
                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      role="menu"
                      aria-label={t("nav.account")}
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep p-2 shadow-lift"
                    >
                      <p className="truncate px-3 pb-1 pt-2 text-xs font-black text-cherry/60">Moi, {user.name.split(" ")[0]} 👋</p>
                      <Link role="menuitem" href="/account" onClick={() => setAccountOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-black text-cherry transition hover:bg-cream">{t("acct.profile")}</Link>
                      <Link role="menuitem" href="/account" onClick={() => setAccountOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-black text-cherry transition hover:bg-cream">{t("nav.orders")}</Link>
                      <Link role="menuitem" href="/favorites" onClick={() => setAccountOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-black text-cherry transition hover:bg-cream">{t("nav.favorites")}</Link>
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => { setAccountOpen(false); logout(); }}
                        className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-black text-cherry-bright transition hover:bg-cream"
                      >
                        {t("acct.signout")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/account"
                aria-label={t("nav.account")}
                className="grid h-11 w-11 place-items-center rounded-full border border-cream/30 text-cream transition hover:bg-cream hover:text-cherry"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.2c-4 0-7.5 2-7.5 4.6V21h15v-2.2c0-2.6-3.5-4.6-7.5-4.6Z" />
                </svg>
              </Link>
            )}
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${cartCount} items`}
              className="relative grid h-11 w-11 place-items-center rounded-full bg-gold text-cherry-dark shadow-card transition hover:bg-gold-soft active:scale-90"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M7 4h-2l-1 2h2l2.6 9.4A2 2 0 0 0 10.5 17h7.7a2 2 0 0 0 1.9-1.4L22 8H6.4L7 4Zm3.5 15a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 10.5 19Zm7 0a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5Z" />
              </svg>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={pulse}
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-cream px-1 text-[11px] font-black text-cherry-deep"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              className="grid h-11 w-11 place-items-center rounded-full border border-cream/30 text-cream lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-current" fill="none" strokeWidth="2.4" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-cherry-dark/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 z-50 h-full w-[82%] max-w-sm bg-cherry-deep shadow-lift lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.45 }}
            >
              <div className="flex items-center justify-between p-5">
                <span className="font-display text-xl font-black text-cream">{t("nav.menu")}</span>
                <button
                  className="grid h-11 w-11 place-items-center rounded-full border border-cream/30 text-cream"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-5" aria-label="Mobile">
                {LINKS.map((l, i) => (
                  <motion.div
                    key={l.href}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.35 }}
                  >
                    <Link
                      href={l.href}
                      className={cx(
                        "block rounded-xl px-4 py-3 text-lg font-black",
                        pathname === l.href
                          ? "bg-gold text-cherry-dark"
                          : "text-cream hover:bg-cream/10"
                      )}
                    >
                      {t(l.key)}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32, duration: 0.35 }}
                >
                  <Link
                    href="/account"
                    className="block rounded-xl px-4 py-3 text-lg font-black text-cream hover:bg-cream/10"
                  >
                    {user ? `Moi, ${user.name.split(" ")[0]} 👋` : t("nav.signin")}
                  </Link>
                  <Link
                    href="/favorites"
                    className="block rounded-xl px-4 py-3 text-lg font-black text-cream hover:bg-cream/10"
                  >
                    {t("nav.favorites")}
                  </Link>
                  {user && (
                    <button
                      type="button"
                      onClick={() => { setOpen(false); logout(); }}
                      className="block w-full rounded-xl px-4 py-3 text-left text-lg font-black text-gold-soft hover:bg-cream/10"
                    >
                      {t("acct.signout")}
                    </button>
                  )}
                </motion.div>
              </nav>
              <div className="flex items-center gap-4 px-9 pt-4">
                <OpenBadge />
                <LangToggle />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
