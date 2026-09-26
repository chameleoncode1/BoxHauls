// Item/tier catalog and small helpers shared by the booking widget
// (src/components/BookingWidget.tsx). Real distance and pricing are now
// computed by the api/ Worker's POST /quote (Google Maps geocoding +
// distance, real formula) — this file no longer does that arithmetic
// itself. Deliberately has no node:fs import: it ships in the client
// bundle (BookingWidget is a React island), so it can't read
// docs/placeholders.json directly the way server-side Astro code does.

export interface PricingConfig {
  baseFare: number;
  perMile: number;
  helperFee: number;
  heavyFee: number;
}

export interface PricingItem {
  slug: string;
  label: string;
  /** Which tier this item typically needs — used to auto-suggest a tier
   * when the customer picks an item, per src/content/pages/pricing/*.mdx. */
  suggestedTier: "tier-1" | "tier-2" | "tier-3";
  /** Whether this item typically triggers the heavy-item fee (matches the
   * pricing pages' own item-by-item framing, e.g. refrigerators). */
  heavy?: boolean;
}

export const ITEMS: PricingItem[] = [
  { slug: "couch", label: "Couch or sofa", suggestedTier: "tier-2" },
  { slug: "mattress", label: "Mattress", suggestedTier: "tier-1" },
  { slug: "refrigerator", label: "Refrigerator", suggestedTier: "tier-2", heavy: true },
  { slug: "washer-and-dryer", label: "Washer and dryer", suggestedTier: "tier-2" },
  { slug: "dump-run", label: "Dump run / junk load", suggestedTier: "tier-2" },
  { slug: "other", label: "Something else", suggestedTier: "tier-2" },
];

export const TIER_SLUGS = ["tier-1", "tier-2", "tier-3"] as const;
export type TierSlug = (typeof TIER_SLUGS)[number];

export interface PriceBreakdown {
  distanceMiles: number;
  baseFare: number;
  mileageCost: number;
  helperCost: number;
  heavyCost: number;
  total: number;
}

/** "$17" -> 17. Used server-side when passing placeholders.json values as
 * numeric props into the client island. */
export function parseDollarAmount(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
