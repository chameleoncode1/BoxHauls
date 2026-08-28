import { getFlatPlaceholders, substituteBrackets } from "./placeholders";
import { parseDollarAmount } from "./mockPricing";
import type { PricingConfig } from "./mockPricing";
import type { TierSlug } from "./mockPricing";

/**
 * Resolves the placeholders.json values BookingWidget needs, server-side
 * (this reads docs/placeholders.json via node:fs, so it can't run in the
 * client bundle — see src/lib/mockPricing.ts for why that's split out).
 * Shared by the homepage mount and /book/ so both stay in sync.
 */
export function getBookingWidgetProps() {
  const ph = getFlatPlaceholders();
  const pricing: PricingConfig = {
    baseFare: parseDollarAmount(ph.BASE_FARE ?? "0"),
    perMile: parseDollarAmount(ph.PER_MILE ?? "0"),
    helperFee: parseDollarAmount(ph.HELPER_FEE ?? "0"),
    heavyFee: parseDollarAmount(ph.HEAVY_FEE ?? "0"),
  };
  const tierNames: Record<TierSlug, string> = {
    "tier-1": ph.TIER_1 ?? "Tier 1",
    "tier-2": ph.TIER_2 ?? "Tier 2",
    "tier-3": ph.TIER_3 ?? "Tier 3",
  };
  const helperAvailabilityNote = substituteBrackets("[[HELPER_AVAILABILITY_NOTE]]", "/book/");
  return { pricing, tierNames, helperAvailabilityNote };
}
