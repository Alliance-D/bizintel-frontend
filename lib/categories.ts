import type { BusinessCategoryKey } from "./platform-api";

export type BusinessCategory = {
  key: BusinessCategoryKey;
  label: string;
  shortLabel: string;
  description: string;
};

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { key: "pharmacy", label: "Pharmacy", shortLabel: "Pharmacy", description: "Health retail and medicine access" },
  { key: "restaurant", label: "Restaurant", shortLabel: "Restaurant", description: "Restaurants, fast food and food courts" },
  { key: "cafe", label: "Cafe", shortLabel: "Cafe", description: "Coffee, snacks, study and social spaces" },
  { key: "grocery", label: "Supermarket", shortLabel: "Supermarket", description: "Supermarkets, convenience shops and grocery stores" },
  { key: "salon", label: "Salon", shortLabel: "Salon", description: "Hair, beauty and personal care services" },
];

export function categoryLabel(key: string) {
  return BUSINESS_CATEGORIES.find((item) => item.key === key)?.label || key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
