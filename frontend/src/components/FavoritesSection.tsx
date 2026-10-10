"use client";
import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { isPizzaItem, isPreorderItem, trName } from "@/lib/v3";
import type { MenuItem } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";
import ItemModal from "./ItemModal";
import PizzaSheet from "./PizzaSheet";
import PreorderSheet from "./PreorderSheet";
import { MenuImage } from "./ui";

export default function FavoritesSection() {
  const { favorites, effectiveMenu, user, openLoginGate } = useShop();
  const { lang } = useLang();
  const [open, setOpen] = useState<MenuItem | null>(null);
  const items = useMemo(() => effectiveMenu(MENU, lang).filter((item) => favorites.includes(item.id)), [effectiveMenu, favorites, lang]);
  if (!user)
    return <section className="mt-6 rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
      <p className="font-script text-xl text-gold-deep">saved for later</p>
      <h2 className="font-display text-lg font-black text-cherry">Favorites</h2>
      <p className="mt-4 text-sm text-cherry/60">Log in or create an account to save your favorite dishes here.</p>
      <button type="button" onClick={openLoginGate} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-cherry-bright px-6 font-black text-cream hover:bg-cherry">Log in / Sign up</button>
    </section>;
  return <section className="mt-6 rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
    <div className="flex items-end justify-between gap-4"><div><p className="font-script text-xl text-gold-deep">saved for later</p><h2 className="font-display text-lg font-black text-cherry">Favorites</h2></div><span className="text-sm font-black text-cherry/50">{items.length}</span></div>
    {items.length === 0 ? <p className="mt-4 text-sm text-cherry/60">Your favorite dishes will appear here.</p> : <ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
      <MenuImage item={item} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1"><p className="truncate font-display font-black text-cherry">{trName(lang, item)}</p><button type="button" onClick={() => setOpen(item)} className="mt-1 text-xs font-black text-cherry-bright underline underline-offset-2">View and add to cart</button></div>
      <FavoriteButton itemId={item.id} className="h-10 w-10 shrink-0 border-cherry/10 bg-cream-deep text-lg" />
    </li>)}</ul>}
    {open && isPizzaItem(open) && <PizzaSheet item={open} onClose={() => setOpen(null)} />}
    {open && isPreorderItem(open) && <PreorderSheet item={open} onClose={() => setOpen(null)} />}
    {open && !isPizzaItem(open) && !isPreorderItem(open) && <ItemModal item={open} onClose={() => setOpen(null)} />}
  </section>;
}
