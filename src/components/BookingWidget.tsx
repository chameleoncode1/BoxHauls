import { useEffect, useState } from "react";
import { ITEMS, TIER_SLUGS, type PriceBreakdown, type PricingConfig, type TierSlug } from "../lib/mockPricing";

// Local dev (astro dev) talks to the api/ Worker's local `wrangler dev`
// instance; production talks to the real deployed API on its own subdomain.
// See api/src/routes/quote.ts for the endpoint this calls.
const API_BASE_URL = import.meta.env.DEV ? "http://localhost:8787" : "https://api.boxhauls.com";

interface QuoteResponse {
  distanceMiles: number;
  breakdown: {
    baseFare: number;
    mileageCost: number;
    helperCost: number;
    heavyCost: number;
    total: number;
  };
}

interface QuoteError {
  error: string;
}

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

/** window.trackBoxHaulsEvent is defined by src/components/Analytics.astro
 * on every page this widget can mount on (BaseLayout for /, book.astro
 * directly for /book/) — logs to console in local dev until
 * GA4_MEASUREMENT_ID is resolved, real gtag calls after. Guarded here
 * since this file also runs in the SSR pass, where window doesn't exist. */
function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.trackBoxHaulsEvent === "function") {
    window.trackBoxHaulsEvent(name, params);
  }
}

declare global {
  interface Window {
    trackBoxHaulsEvent?: (name: string, params?: Record<string, unknown>) => void;
  }
}

/**
 * Rider booking widget (kickoff Prompt 5, pricing made real in the
 * booking-backend Phase 1 build). Address inputs, item and tier pickers,
 * and a price display driven by a real quote from the api/ Worker
 * (POST /quote — real Google Maps geocoding and driving distance, real
 * formula). Booking itself is still a preview: submitting shows a
 * "preview of the booking flow" message rather than creating a real haul,
 * since payment collection and driver matching don't exist yet. No driver
 * cards, ETAs, ratings, or revenue split anywhere in this flow (CLAUDE.md
 * #3 / #7) — those don't belong on the rider side even once real data
 * exists, let alone in a stub.
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

  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Real geocoded price from the api/ Worker, debounced so a quote isn't
  // fired on every keystroke while an address is still being typed.
  useEffect(() => {
    if (!showPrice) {
      setBreakdown(null);
      setQuoteError(null);
      return;
    }
    const heavy = Boolean(selectedItem?.heavy);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setQuoteLoading(true);
      setQuoteError(null);
      fetch(`${API_BASE_URL}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ pickup, dropoff, tier, helper, heavy }),
      })
        .then(async (res) => {
          const data = (await res.json()) as QuoteResponse | QuoteError;
          if (!res.ok || "error" in data) {
            throw new Error("error" in data ? data.error : "Could not calculate a price for these addresses.");
          }
          setBreakdown({
            distanceMiles: data.distanceMiles,
            baseFare: data.breakdown.baseFare,
            mileageCost: data.breakdown.mileageCost,
            helperCost: data.breakdown.helperCost,
            heavyCost: data.breakdown.heavyCost,
            total: data.breakdown.total,
          });
          trackEvent("price_shown", { item: item || undefined, tier });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setBreakdown(null);
          setQuoteError(err instanceof Error ? err.message : "Could not calculate a price for these addresses.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuoteLoading(false);
        });
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPrice, pickup, dropoff, tier, helper, selectedItem]);

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
        trackEvent("booking_started", { item: item || undefined, tier, helper, total: breakdown?.total });
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

      {showPrice && quoteLoading && !breakdown && (
        <p className="text-sm text-text-muted" role="status">
          Checking addresses...
        </p>
      )}

      {showPrice && quoteError && (
        <p className="text-sm text-red-600" role="alert">
          {quoteError}
        </p>
      )}

      {showPrice && breakdown && (
        <div className="rounded-md border border-border bg-bg p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-text-muted">Base fare</span>
            <span>{formatDollars(breakdown.baseFare)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Mileage</span>
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
        disabled={!showPrice || !breakdown || quoteLoading}
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
