// Pure, isomorphic pricing logic for the booking widget (kickoff Prompt 5:
// "build a UI stub ... that calls a mock pricing function reading
// placeholders.json" — no legacy Lovable component exists in ./legacy/ to
// port from). Deliberately has no node:fs import: this file ships in the
// client bundle (src/components/BookingWidget.tsx runs as a React island),
// so it can't read docs/placeholders.json directly the way server-side
// Astro code does. The actual resolved values are fetched server-side
// (src/lib/placeholders.ts) and passed in as props — this module only
// does the arithmetic.

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

/**
 * Deterministic mock distance from two address strings — NOT real
 * geocoding or routing. Stands in until a real mapping/routing API is
 * integrated. Same two addresses always produce the same distance (a
 * simple string hash), so the UI doesn't feel random on every keystroke,
 * but this is not a real distance and must not be presented as one
 * beyond this stub.
 */
export function mockDistanceMiles(pickup: string, dropoff: string): number {
  const combined = `${pickup.trim().toLowerCase()}|${dropoff.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash % 2600) / 100; // 0-26
  return Math.round((normalized + 2) * 10) / 10; // 2-28 miles, 1 decimal
}

export interface PriceBreakdown {
  distanceMiles: number;
  baseFare: number;
  mileageCost: number;
  helperCost: number;
  heavyCost: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculatePrice(
  config: PricingConfig,
  distanceMiles: number,
  opts: { helper: boolean; heavy: boolean }
): PriceBreakdown {
  const mileageCost = round2(distanceMiles * config.perMile);
  const helperCost = opts.helper ? config.helperFee : 0;
  const heavyCost = opts.heavy ? config.heavyFee : 0;
  const total = round2(config.baseFare + mileageCost + helperCost + heavyCost);
  return { distanceMiles, baseFare: config.baseFare, mileageCost, helperCost, heavyCost, total };
}

/** "$17" -> 17. Used server-side when passing placeholders.json values as
 * numeric props into the client island. */
export function parseDollarAmount(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
