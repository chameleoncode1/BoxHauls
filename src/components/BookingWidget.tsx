import { useEffect, useMemo, useState } from "react";
import {
  ITEMS,
  TIER_SLUGS,
  calculatePrice,
  mockDistanceMiles,
  type PricingConfig,
  type TierSlug,
} from "../lib/mockPricing";

export interface BookingWidgetProps {
  pricing: PricingConfig;
  tierNames: Record<TierSlug, string>;
  helperAvailabilityNote: string;
  /** Optional explicit overrides. Prefer letting the widget read the
   * query string itself (see getQueryParam below) — this exists for a
   * caller that already has the values some other way. */
  initialItem?: string;
  initialTier?: string;
}

function isTierSlug(value: string): value is TierSlug {
  return (TIER_SLUGS as readonly string[]).includes(value);
}

/**
 * Rider booking widget (kickoff Prompt 5). No legacy Lovable component
 * exists in ./legacy/ to port from, so this is a UI stub: real address
 * inputs, item and tier pickers, and a price display driven by a mock
 * pricing function (src/lib/mockPricing.ts) that reads resolved
 * placeholders.json values passed in as props. No driver cards, ETAs,
 * ratings, or revenue split anywhere in this flow (CLAUDE.md #3 / #7,
 * kickoff Prompt 5 item 1) — those don't belong on the rider side even
 * once real data exists, let alone in a stub.
 */
export default function BookingWidget({
  pricing,
  tierNames,
  helperAvailabilityNote,
  initialItem,
  initialTier,
}: BookingWidgetProps) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [item, setItem] = useState("");
  const [tier, setTier] = useState<TierSlug>("tier-2");
  const [tierTouched, setTierTouched] = useState(false);
  const [helper, setHelper] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // /book/ is a static (build-time) route, not server-rendered per
  // request, so a real query string (?item=couch&tier=tier-2) only
  // exists in the browser, never during the server/SSR render pass that
  // produces the initial HTML — Astro.url.searchParams in book.astro's
  // frontmatter is always empty at build time. Applying the pre-fill in
  // an effect (rather than a useState initializer) guarantees this runs
  // client-side, after mount, instead of depending on exactly how
  // astro-island's hydration reconciles a value that would otherwise
  // differ between the server-rendered and client-rendered pass.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryItem = initialItem ?? params.get("item") ?? undefined;
    const queryTier = initialTier ?? params.get("tier") ?? undefined;
    const itemMatch = ITEMS.find((i) => i.slug === queryItem);
    if (itemMatch) setItem(itemMatch.slug);
    if (queryTier && isTierSlug(queryTier)) {
      setTier(queryTier);
      setTierTouched(true);
    } else if (itemMatch) {
      setTier(itemMatch.suggestedTier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedItem = ITEMS.find((i) => i.slug === item);
  const showPrice = pickup.trim().length > 0 && dropoff.trim().length > 0;

  const breakdown = useMemo(() => {
    if (!showPrice) return null;
    const distance = mockDistanceMiles(pickup, dropoff);
    return calculatePrice(pricing, distance, { helper, heavy: Boolean(selectedItem?.heavy) });
  }, [showPrice, pickup, dropoff, helper, selectedItem, pricing]);

  function handleItemChange(slug: string) {
    setItem(slug);
    if (!tierTouched) {
      const match = ITEMS.find((i) => i.slug === slug);
      if (match) setTier(match.suggestedTier);
    }
  }

  function handleTierChange(slug: TierSlug) {
    setTier(slug);
    setTierTouched(true);
  }

  return (
    <form
      className="rounded-lg border border-border bg-surface p-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Pickup address</span>
          <input
            type="text"
            required
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Street address, Fresno or Clovis"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Drop-off address</span>
          <input
            type="text"
            required
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="Street address, Fresno or Clovis"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium mb-1">What's moving</span>
          <select
            value={item}
            onChange={(e) => handleItemChange(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select an item
            </option>
            {ITEMS.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Truck tier</span>
          <select
            value={tier}
            onChange={(e) => handleTierChange(e.target.value as TierSlug)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          >
            {TIER_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {tierNames[slug]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={helper}
            onChange={(e) => setHelper(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Add a helper (+{formatDollars(pricing.helperFee)})
            <span className="block text-xs text-text-muted mt-0.5">{helperAvailabilityNote}</span>
          </span>
        </label>
      </div>

      {showPrice && breakdown && (
        <div className="rounded-md border border-border bg-bg p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-text-muted">Base fare</span>
            <span>{formatDollars(breakdown.baseFare)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Mileage (est.)</span>
            <span>{formatDollars(breakdown.mileageCost)}</span>
          </div>
          {breakdown.heavyCost > 0 && (
            <div className="flex justify-between">
              <span className="text-text-muted">Heavy-item fee</span>
              <span>{formatDollars(breakdown.heavyCost)}</span>
            </div>
          )}
          {breakdown.helperCost > 0 && (
            <div className="flex justify-between">
              <span className="text-text-muted">Helper</span>
              <span>{formatDollars(breakdown.helperCost)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-2 border-t border-border mt-2">
            <span>Total</span>
            <span>{formatDollars(breakdown.total)}</span>
          </div>
        </div>
      )}

      {!showPrice && (
        <p className="text-sm text-text-muted">Enter both addresses to see the price.</p>
      )}

      <button
        type="submit"
        disabled={!showPrice}
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Book this haul
      </button>

      {submitted && (
        <p className="text-sm text-text-muted" role="status">
          This is a preview of the booking flow — live booking opens once BoxHauls launches in Fresno.
        </p>
      )}
    </form>
  );
}

function formatDollars(n: number): string {
  return `$${n.toFixed(2)}`;
}
