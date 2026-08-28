import type { SitemapEntry } from "./sitemap";
import { substitute } from "./placeholders";

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function lastSegment(url: string): string {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

// Matches the item slug out of e.g. "cost-to-move-a-couch",
// "cost-to-move-an-exercise-bike", "cost-to-deliver-a-kayak",
// "cost-to-haul-a-motorcycle", "cost-of-a-dump-run".
const PRICING_ITEM_RE = /^cost-to-(?:move|deliver|haul)-an?-(.+)$|^cost-of-an?-(.+)$/;

/**
 * Title formulas per topical-map.md §4.1. Formulas are only defined there
 * for 9 of the 11 templates; partners/legal extend the same "{H1} |
 * BoxHauls <section>" pattern used by guide/driver.
 */
function deriveTitle(entry: SitemapEntry): string {
  const h1 = substitute(entry.h1, entry.url);

  switch (entry.template) {
    case "home":
      return substitute("BoxHauls: Truck & Driver On Demand in {{METRO}}", entry.url);

    case "core":
      return `${h1} | BoxHauls`;

    case "pricing": {
      const match = lastSegment(entry.url).match(PRICING_ITEM_RE);
      const itemSlug = match?.[1] ?? match?.[2];
      if (itemSlug) {
        return substitute(`How Much Does It Cost to Move a ${titleCase(itemSlug)}? ({{YEAR}}) | BoxHauls`, entry.url);
      }
      // Non-item pricing pages (hourly-vs-per-trip, pickup-truck-delivery-cost)
      // don't fit the item formula — fall back to the core pattern.
      return `${h1} | BoxHauls`;
    }

    case "service-hub":
      return substitute(`${titleCase(lastSegment(entry.url))} in {{METRO}}: Truck & Driver On Demand | BoxHauls`, entry.url);

    case "service-spoke":
      return substitute(`${titleCase(lastSegment(entry.url))} in {{METRO}} | BoxHauls`, entry.url);

    case "city":
      return substitute("Truck & Driver On Demand in {{METRO}} | BoxHauls", entry.url);

    case "compare": {
      const competitor = titleCase(lastSegment(entry.url).replace(/^boxhauls-vs-/, ""));
      return substitute(`BoxHauls vs. ${competitor}: Price, Coverage, Insurance ({{YEAR}})`, entry.url);
    }

    case "guide":
      return `${h1} | BoxHauls Guides`;

    case "driver":
      return `${h1} | Drive for BoxHauls`;

    case "partners":
      return `${h1} | BoxHauls Partners`;

    case "legal":
    default:
      return `${h1} | BoxHauls`;
  }
}

/**
 * Provisional meta descriptions: honest, factual (formula + metro, never
 * an invented price range), but not the final SEO copy map §9 calls for
 * ("state the answer... no keyword lists") — that requires real page
 * content, which lands in kickoff Prompt 4.
 */
function deriveDescription(entry: SitemapEntry): string {
  const h1 = substitute(entry.h1, entry.url);
  if (entry.template === "pricing") {
    return substitute(
      `${h1} BoxHauls prices per trip: {{BASE_FARE}} base plus {{PER_MILE}}/mile in {{METRO}}, shown before you book.`,
      entry.url
    );
  }
  return substitute(
    `${h1} — ${entry.primary_query} in {{METRO}}, with a truck and driver and the price shown before you book.`,
    entry.url
  );
}

export interface PageMeta {
  title: string;
  description: string;
  ogImage: string;
}

/** Matches the slug scheme in src/pages/og/[...slug].png.ts. */
export function getOgImageUrl(entry: SitemapEntry): string {
  const trimmed = entry.url.replace(/^\/|\/$/g, "");
  return `https://boxhauls.com/og/${trimmed === "" ? "home" : trimmed}.png`;
}

export function getMeta(entry: SitemapEntry): PageMeta {
  return {
    title: deriveTitle(entry),
    description: deriveDescription(entry),
    ogImage: getOgImageUrl(entry),
  };
}
