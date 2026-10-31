import type { MenuItem, ModGroup } from "./types";

export const ATERIA_DRINK_GROUP: ModGroup = {
  id: "ateria-drink",
  name: "Cold drink 0.33 L",
  nameEn: "Cold drink 0.33 L",
  nameFi: "Kylmä juoma 0.33 L",
  type: "single",
  required: true,
  options: [
    { label: "Coca-Cola 0.33 L", price: 0 },
    { label: "Coca-Cola Zero 0.33 L", price: 0 },
    { label: "Pepsi 0.33 L", price: 0 },
    { label: "Pepsi Max 0.33 L", price: 0 },
    { label: "Jaffa 0.33 L", price: 0 },
    { label: "Sprite 0.33 L", price: 0 },
    { label: "Fanta 0.33 L", price: 0 },
  ],
};

export function isAteriaMeal(item: Pick<MenuItem, "name" | "nameFi" | "desc" | "prices">, variantLabel: string): boolean {
  const blob = `${item.name ?? ""} ${item.nameFi ?? ""}`.toLowerCase();
  if (blob.includes("ateria")) return true;
  if (variantLabel === "Ateria") return true;
  return false;
}

export function modsForItem(item: MenuItem, variantLabel: string): ModGroup[] {
  const groups = [...(item.mods ?? [])];
  if (isAteriaMeal(item, variantLabel) && !groups.some((group) => group.id === ATERIA_DRINK_GROUP.id)) {
    groups.push(ATERIA_DRINK_GROUP);
  }
  return groups;
}
