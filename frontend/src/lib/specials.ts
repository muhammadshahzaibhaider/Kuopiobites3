/**
 * Today's Special helpers shared by the admin panel and the menu item list, so
 * "add to Today's Special" behaves the same wherever the manager starts.
 */
import type { SpecialItem } from "./types";

/** Unique draft id. Two clicks in the same millisecond must not collide. */
export const newSpecialId = () =>
  `ts-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A new carousel entry for a dish, with the default badge text. */
export function buildSpecial(itemId: string, sortOrder: number): SpecialItem {
  return {
    id: newSpecialId(),
    itemId,
    sortOrder,
    active: true,
    textEn: "Today's Special",
    textFi: "Päivän annos",
  };
}

/** The special that already shows this dish, if any. */
export function specialForItem(specials: SpecialItem[], itemId: string): SpecialItem | undefined {
  return specials.find((special) => special.itemId === itemId);
}

/**
 * The list with the dish added, or `null` when it is already on the carousel —
 * the caller decides how to tell the manager.
 */
export function withSpecialFor(specials: SpecialItem[], itemId: string): SpecialItem[] | null {
  if (specialForItem(specials, itemId)) return null;
  return [...specials, buildSpecial(itemId, specials.length)];
}

/**
 * The checks the database enforces, mirrored so the manager sees the actual
 * mistake instead of a generic "could not be saved". Returns a message or null.
 */
export function specialsValidationError(specials: SpecialItem[]): string | null {
  const badDates = specials.find((special) => special.start && special.end && special.end < special.start);
  if (badDates) return "“To” is before “From” — fix the dates on that card";
  const badDiscount = specials.find((special) => special.discount != null && (special.discount < 0 || special.discount > 100));
  if (badDiscount) return "Discount must be between 0 and 100 %";
  const badPrice = specials.find((special) => special.overridePrice != null && special.overridePrice < 0);
  if (badPrice) return "Override price cannot be negative";
  return null;
}
