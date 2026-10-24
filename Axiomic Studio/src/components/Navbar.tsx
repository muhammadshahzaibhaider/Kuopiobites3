"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PRIMARY_NAV, RESOURCE_LINKS, SITE } from "@/lib/content";
import { SERVICES } from "@/lib/data/services";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { PillButton } from "./PillButton";
import { ArrowUpRight, ChevronDown, Close, Menu, Plus } from "./icons";

type MenuKey = "services" | "resources";

const panelMotion = {
  initial: { opacity: 0, y: 8, x: "-50%", scale: 0.995 },
  animate: { opacity: 1, y: 0, x: "-50%", scale: 1 },
  exit: { opacity: 0, y: 6, x: "-50%", scale: 0.995 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const closeMenus = useCallback(() => setOpenMenu(null), []);

  /* Close the mobile sheet whenever the route changes. */
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenMenu(null);
      setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  /* Lock page scroll + move focus into the full-screen mobile menu. */
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled || openMenu
            ? "border-b border-hairline bg-ink/75 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="content-shell">
          <div
            ref={navRef}
            className="relative flex h-20 items-center justify-between"
            onMouseLeave={closeMenus}
          >
            <Link
              href="/"
              className="group inline-flex items-center rounded-full text-fg transition-opacity duration-200 hover:opacity-80"
              aria-label={`${SITE.brand} — home`}
            >
              <Logo />
            </Link>

            {/* Desktop navigation */}
            <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
              <ul className="flex items-center gap-1">
                {PRIMARY_NAV.map((item) => {
                  const active = isActive(pathname, item.href);

                  if (!item.menu) {
                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "inline-flex h-10 items-center rounded-full px-4 text-ui transition-colors duration-200",
                            active ? "text-fg" : "text-muted hover:text-fg",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  }

                  const isOpen = openMenu === item.menu;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-ui transition-colors duration-200",
                          isOpen || active ? "text-fg" : "text-muted hover:text-fg",
                        )}
                        aria-expanded={isOpen}
                        aria-controls={`nav-${item.menu}-panel`}
                        aria-haspopup="true"
                        onMouseEnter={() => setOpenMenu(item.menu ?? null)}
                        onFocus={() => setOpenMenu(item.menu ?? null)}
                        onClick={() => setOpenMenu(isOpen ? null : item.menu ?? null)}
                      >
                        {item.label}
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              <PillButton href="/contact" size="sm" className="hidden sm:inline-flex">
                Start Your Project
              </PillButton>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border border-hairline text-fg transition-colors duration-200 hover:border-hairline-strong hover:bg-white/[0.05] lg:hidden"
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Desktop panels */}
            <AnimatePresence>
              {openMenu ? (
                <motion.div
                  key={openMenu}
                  id={`nav-${openMenu}-panel`}
                  className={cn(
                    "absolute top-full left-1/2 hidden pt-2 lg:block",
                    openMenu === "services"
                      ? "w-[min(64rem,calc(100vw-3rem))]"
                      : "w-[min(34rem,calc(100vw-3rem))]",
                  )}
                  {...panelMotion}
                >
                  <div className="overflow-hidden rounded-card border border-hairline bg-ink-soft/95 p-3 shadow-lift backdrop-blur-xl">
                    {openMenu === "services" ? (
                      <ServicesPanel onNavigate={closeMenus} />
                    ) : (
                      <ResourcesPanel onNavigate={closeMenus} />
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <MobileMenu key="mobile-menu" closeRef={closeRef} onClose={() => setMobileOpen(false)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ServicesPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <Link
        href="/case-study/talitrix"
        onClick={onNavigate}
        className="group relative overflow-hidden rounded-2xl border border-hairline focus-visible:outline-offset-4"
        aria-label="Our latest work: Talitrix case study"
      >
        <div className="relative aspect-[16/12] w-full">
          <Image
            src="/images/nav-feature.jpg"
            alt=""
            fill
            sizes="(min-width: 1024px) 320px, 90vw"
            className="object-cover opacity-90 transition-transform duration-500 ease-expo group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-micro uppercase text-white/55">Our latest work</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-lg font-medium tracking-tight text-fg">Talitrix</span>
            <ArrowUpRight className="h-4 w-4 text-white/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </Link>

      <ul className="grid content-start gap-1 sm:grid-cols-2">
        {SERVICES.map((service) => (
          <li key={service.slug}>
            <Link
              href={`/services/${service.slug}`}
              onClick={onNavigate}
              className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-white/[0.05]"
            >
              <span className="pt-0.5 font-mono text-xxs text-muted-dim">{service.number}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium tracking-tight text-fg group-hover:text-white">
                  {service.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {service.short}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResourcesPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {RESOURCE_LINKS.map((item) => (
        <li
          key={item.label}
          className={item.label === "Free Templates & Tools" ? "sm:col-span-2" : undefined}
        >
          <Link
            href={item.href}
            onClick={onNavigate}
            className="group flex items-start justify-between gap-4 rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-white/[0.05]"
          >
            <span>
              <span className="block text-sm font-medium tracking-tight text-fg">{item.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                {item.description}
              </span>
            </span>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MobileMenu({
  onClose,
  closeRef,
}: {
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement>;
}) {
  const [expanded, setExpanded] = useState<MenuKey | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  /* Keep Tab inside the dialog while it is open. */
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <motion.div
      ref={dialogRef}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className="fixed inset-0 z-[60] flex flex-col bg-ink lg:hidden"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="content-shell flex h-20 shrink-0 items-center justify-between border-b border-hairline">
        <Link href="/" onClick={onClose} aria-label={`${SITE.brand} — home`}>
          <Logo />
        </Link>
        <button
          ref={closeRef}
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-hairline text-fg transition-colors hover:bg-white/[0.06]"
          aria-label="Close menu"
          onClick={onClose}
        >
          <Close className="h-5 w-5" />
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="content-shell py-8">
          <ul className="flex flex-col">
            {PRIMARY_NAV.map((item) => {
              if (!item.menu) {
                return (
                  <li key={item.label} className="border-b border-hairline">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center justify-between py-5 text-2xl font-medium tracking-tight text-fg"
                    >
                      {item.label}
                      <ArrowUpRight className="h-5 w-5 text-muted" />
                    </Link>
                  </li>
                );
              }

              const isExpanded = expanded === item.menu;
              const panelId = `mobile-${item.menu}-panel`;
              return (
                <li key={item.label} className="border-b border-hairline">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-5 text-2xl font-medium tracking-tight text-fg"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => setExpanded(isExpanded ? null : item.menu ?? null)}
                  >
                    {item.label}
                    <Plus
                      className={cn(
                        "h-5 w-5 text-muted transition-transform duration-300",
                        isExpanded && "rotate-45",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isExpanded ? (
                      <motion.div
                        id={panelId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <ul className="flex flex-col gap-1 pb-5">
                          {item.menu === "services"
                            ? SERVICES.map((service) => (
                                <li key={service.slug}>
                                  <Link
                                    href={`/services/${service.slug}`}
                                    onClick={onClose}
                                    className="flex items-start gap-3 rounded-xl px-1 py-2.5"
                                  >
                                    <span className="pt-0.5 font-mono text-xxs text-muted-dim">
                                      {service.number}
                                    </span>
                                    <span>
                                      <span className="block text-base text-fg">{service.title}</span>
                                      <span className="mt-0.5 block text-xs text-muted">
                                        {service.short}
                                      </span>
                                    </span>
                                  </Link>
                                </li>
                              ))
                            : RESOURCE_LINKS.map((resource) => (
                                <li key={resource.label}>
                                  <Link
                                    href={resource.href}
                                    onClick={onClose}
                                    className="block rounded-xl px-1 py-2.5"
                                  >
                                    <span className="block text-base text-fg">{resource.label}</span>
                                    <span className="mt-0.5 block text-xs text-muted">
                                      {resource.description}
                                    </span>
                                  </Link>
                                </li>
                              ))}
                        </ul>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>

          <div className="mt-8">
            <PillButton href="/contact" className="w-full justify-between" size="md" onClick={onClose}>
              Start Your Project
            </PillButton>
          </div>

          <div className="mt-8 space-y-1 text-sm text-muted">
            <p className="text-eyebrow uppercase text-muted-dim">Get in touch</p>
            <a href={`mailto:${SITE.email}`} className="block text-fg">
              {SITE.email}
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
