"use client";
import { useState } from "react";
import { cx } from "@/lib/format";
import { useShop } from "@/lib/store";

export default function FavoriteButton({ itemId, className }: { itemId: string; className?: string }) {
  const { isFavorite, toggleFavorite } = useShop();
  const [busy, setBusy] = useState(false);
  const active = isFavorite(itemId);
  return <button
    type="button"
    disabled={busy}
    aria-label={active ? "Remove from favorites" : "Add to favorites"}
    aria-pressed={active}
    onClick={async (event) => { event.stopPropagation(); if (busy) return; setBusy(true); try { await toggleFavorite(itemId); } finally { setBusy(false); } }}
    className={cx("grid h-11 w-11 place-items-center rounded-full border-2 border-cream bg-cream/95 text-xl leading-none shadow-card transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold disabled:opacity-60", active ? "text-cherry-bright" : "text-cherry/55", className)}
  >
    <span aria-hidden>{active ? "♥" : "♡"}</span>
  </button>;
}
