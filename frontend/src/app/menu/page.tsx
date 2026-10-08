"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ItemModal from "@/components/ItemModal";
import OffersStrip from "@/components/OffersStrip";
import PizzaSheet from "@/components/PizzaSheet";
import PreorderSheet from "@/components/PreorderSheet";
import { MenuImage, StaggerItem, TagBadge } from "@/components/ui";
import { cx, eur } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { isCatOff, isItemOff, isPizzaItem, isPreorderItem, offerPrice, optionOff, pizzaIncluded, toppingLabel, trDesc, trLabel, trName } from "@/lib/v3";
import type { MenuItem } from "@/lib/types";

function MenuInner() {
  const params = useSearchParams();
  const { toast, overrides, effectiveMenu, categories, settings } = useShop();
  const { t, lang } = useLang();
  const reduce = useReducedMotion();
  const cats = categories().filter((c) => !settings.catMeta[c.id]?.hidden);
  const [cat, setCat] = useState<string>(params.get("cat") ?? "specials");
  const [q, setQ] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [modal, setModal] = useState<MenuItem | null>(null);
  const [preItem, setPreItem] = useState<MenuItem | null>(null);
  const [pizzaItem, setPizzaItem] = useState<MenuItem | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const deep = params.get("item");

  const all = useMemo(() => effectiveMenu(MENU, lang), [effectiveMenu, overrides, lang]);

  /* deep link: /menu?item=<id> → category, scroll, pulse, auto-open sheet */
  useEffect(() => {
    if (!deep) return;
    const item = all.find((m) => m.id === deep);
    if (!item) {
      toast(t("menu.none"), "err");
      return;
    }
    setCat(item.cat);
    const to = setTimeout(() => {
      document.getElementById(`mi-${deep}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      setHighlight(deep);
      setTimeout(() => setHighlight(null), 2200);
      setTimeout(() => {
        if (isPreorderItem(item)) setPreItem(item);
        else if (isPizzaItem(item)) setPizzaItem(item);
        else setModal(item);
      }, 350);
    }, 200);
    return () => clearTimeout(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deep]);

  const searching = q.trim().length > 0 || vegOnly;

  const items = useMemo(() => {
    let list = all;
    if (!searching) list = list.filter((m) => m.cat === cat);
    if (vegOnly) list = list.filter((m) => m.tags?.includes("veg"));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(s) ||
          (m.desc ?? "").toLowerCase().includes(s) ||
          cats.find((c) => c.id === m.cat)?.title.toLowerCase().includes(s) ||
          cats.find((c) => c.id === m.cat)?.en?.toLowerCase().includes(s)
      );
    }
    if (settings.hideUnavailable)
      list = list.filter((m) => !isItemOff(settings, m.id) && !isCatOff(settings, m.cat) && !overrides.items[m.id]?.soldOut);
    return list;
  }, [all, cat, q, vegOnly, searching, settings, overrides, cats]);

  const catTitle = (id: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return id;
    return lang === "fi" ? c.title : c.en ?? c.title;
  };

  const quickAdd = (m: MenuItem) => {
    if (isItemOff(settings, m.id) || isCatOff(settings, m.cat) || overrides.items[m.id]?.soldOut) return;
    if (isPreorderItem(m)) {
      setPreItem(m);
      return;
    }
    if (isPizzaItem(m)) {
      setPizzaItem(m);
      return;
    }
    // Every non-pizza item gets the same configurable detail modal instead of
    // bypassing it with an immediate one-click add.
    setModal(m);
  };

  return (
    <div className="pt-24 sm:pt-32">
      <div className="container-x">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="font-script text-2xl text-gold-deep -rotate-1">{t("menu.kicker")}</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-cherry">{t("menu.title")}</h1>
          <div className="gold-rule mt-4 w-24" />
        </motion.div>

        <OffersStrip />

        {/* sticky search + pills */}
        <div className="sticky top-16 sm:top-20 z-30 -mx-4 mt-6 bg-cream/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cherry/50">🔍</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("menu.search")}
                className="min-h-[44px] w-full rounded-full border border-cherry/20 bg-cream-deep pl-10 pr-4 text-sm font-bold placeholder:text-cherry/40 focus:border-gold-deep"
              />
            </label>
            <button
              onClick={() => setVegOnly((v) => !v)}
              aria-pressed={vegOnly}
              className={cx(
                "min-h-[44px] rounded-full border-2 px-4 text-sm font-black transition",
                vegOnly ? "border-[#2e7d32] bg-[#2e7d32] text-cream" : "border-cherry/20 text-cherry hover:border-[#2e7d32] hover:text-[#2e6b31]"
              )}
            >
              🌱 {t("menu.veg")}
            </button>
            <span className="ml-auto text-xs font-black text-cherry/50">
              {items.length} {items.length === 1 ? t("menu.dish") : t("menu.dishes")}
            </span>
          </div>
          {!searching && (
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={cx(
                    "relative min-h-[44px] shrink-0 rounded-full px-4 text-sm font-black transition-colors",
                    cat === c.id ? "text-cream" : "text-cherry hover:text-gold-deep",
                    isCatOff(settings, c.id) && "opacity-40"
                  )}
                >
                  {cat === c.id && (
                    <motion.span
                      layoutId="cat-pill"
                      className="absolute inset-0 rounded-full bg-cherry-bright shadow-card"
                      transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0.25, duration: 0.55 }}
                    />
                  )}
                  <span className="relative">{catTitle(c.id)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {searching ? (
          <div className="mt-8">
            <h2 className="mb-4 font-display text-xl font-black text-cherry">
              {q.trim() ? `${t("menu.results")} “${q.trim()}”` : t("menu.vegDishes")}
            </h2>
            <ItemGrid items={items} onAdd={quickAdd} highlight={highlight} />
          </div>
        ) : (
          <div key={cat} className="mt-8">
            <h2 className="mb-1 font-display text-2xl font-black text-cherry">{catTitle(cat)}</h2>
            <p className="mb-5 text-sm text-cherry/60">
              {cat === "fantasia" || cat === "pannu" ? t("menu.builder") : t("menu.ateria")}
            </p>
            <ItemGrid items={items} onAdd={quickAdd} highlight={highlight} />
          </div>
        )}
      </div>
      <ItemModal item={modal} onClose={() => setModal(null)} />
      <PreorderSheet item={preItem} onClose={() => setPreItem(null)} />
      <PizzaSheet item={pizzaItem} onClose={() => setPizzaItem(null)} />
    </div>
  );
}

function ItemGrid({ items, onAdd, highlight }: { items: MenuItem[]; onAdd: (m: MenuItem) => void; highlight: string | null }) {
  const { overrides, settings } = useShop();
  const { t, lang } = useLang();
  if (items.length === 0)
    return <p className="rounded-3xl bg-cream-deep p-10 text-center font-bold text-cherry/60">{t("menu.none")} 🍽</p>;
  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      initial="hide"
      animate="show"
      variants={{ hide: {}, show: { transition: { staggerChildren: 0.045 } }}}
    >
      {items.map((m) => {
        const soldOut = overrides.items[m.id]?.soldOut;
        const off = isItemOff(settings, m.id) || isCatOff(settings, m.cat) || soldOut;
        const pre = isPreorderItem(m);
        const min = Math.min(...m.prices.map((p) => p.value));
        const deal = offerPrice(settings, m, 0);
        const incLabels = isPizzaItem(m) ? pizzaIncluded(m).map((l) => toppingLabel(settings, lang, l)) : [];
        const desc = trDesc(lang, m) || (incLabels.length ? `${t("pizza.included")}: ${incLabels.join(", ")}` : "");
        const price = deal ? deal.now : min;
        return (
          <StaggerItem key={m.id}>
            <div
              id={`mi-${m.id}`}
              className={cx(
                "relative",
                highlight === m.id && "rounded-3xl ring-4 ring-gold motion-safe:animate-pulseSoft"
              )}
            >
              <button
                onClick={() => onAdd(m)}
                disabled={off}
                aria-label={`${trName(lang, m)} — ${off ? t("avail.unavailable") : `${t("menu.add")}, ${eur(price)}`}`}
                className={cx(
                  "card-tilt flex w-full gap-3 rounded-3xl border border-cherry/10 bg-cream-deep p-4 text-left shadow-card transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold",
                  off && "cursor-not-allowed opacity-60"
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-lg font-black leading-tight text-cherry">{trName(lang, m)}</span>
                  {desc && <span className="mt-1 block text-sm text-cherry/70">{desc}</span>}
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-3">
                    <span className="flex flex-wrap gap-1.5">
                      {m.tags?.map((tag) => <TagBadge key={tag} tag={tag} />)}
                      {pre && <span className="inline-flex items-center whitespace-nowrap rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-black text-gold-deep">{t("pre.badge")}</span>}
                    </span>
                    {off ? (
                      <span className="rounded-full bg-brick/15 px-3 py-1.5 text-xs font-black text-brick">{t("avail.unavailable")}</span>
                    ) : (
                      <span className="ml-auto whitespace-nowrap font-display text-lg font-black text-gold-deep">
                        {deal && <span className="mr-1 text-sm font-bold text-cherry/40 line-through">{eur(deal.was)}</span>}
                        {m.prices.length > 1 ? `${t("menu.from")} ` : ""}
                        {eur(price)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="relative w-24 shrink-0 sm:w-28">
                  <MenuImage item={m} sizes="(max-width: 640px) 96px, 112px" className="rounded-2xl" />
                  {!off && (
                    <span
                      aria-hidden
                      className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full bg-gold text-xl font-black text-cherry-dark shadow-card"
                    >
                      +
                    </span>
                  )}
                </span>
              </button>
            </div>
          </StaggerItem>
        );
      })}
    </motion.div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="pt-32" />}>
      <MenuInner />
    </Suspense>
  );
}
