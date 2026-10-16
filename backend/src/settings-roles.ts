import type { Role } from "./auth";
import type { Settings } from "./lib/types";

const MANAGER_FIELDS = new Set<keyof Settings>([
  "catMeta", "catOrder", "offCats", "offItems", "offOptions", "toppings", "toppingMeta",
  "todaysSpecials", "blockedSlots", "blockedDates",
]);
const KITCHEN_FIELDS = new Set<keyof Settings>(["offItems"]);

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, canonical(entry)]),
  );
  return value;
};

/** Compare a validated request with the current DB settings and enforce role-level field allowlists. */
export function changedSettings(current: Settings, submitted: Settings): Array<keyof Settings> {
  return (Object.keys(current) as Array<keyof Settings>).filter((field) =>
    JSON.stringify(canonical(submitted[field])) !== JSON.stringify(canonical(current[field])),
  );
}

export function forbiddenSettingsChanges(role: Role, changed: Array<keyof Settings>): Array<keyof Settings> {
  const allowed = role === "owner" ? null : role === "manager" ? MANAGER_FIELDS : KITCHEN_FIELDS;
  return allowed ? changed.filter((field) => !allowed.has(field)) : [];
}
