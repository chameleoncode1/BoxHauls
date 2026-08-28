import type { SitemapEntry } from "./sitemap";
import { getBreadcrumbs } from "./breadcrumbs";
import { substitute, getFlatPlaceholders, isResolvedValue } from "./placeholders";

const ORG_ID = "https://boxhauls.com/#organization";
const SITE_URL = "https://boxhauls.com";

type Node = Record<string, unknown>;

/**
 * "3690 E International Ave, Clovis, CA 93619" -> street/city/state/zip.
 * Falls back to putting the whole string in streetAddress if the shape
 * doesn't match a plain "street, city, state zip" address — this never
 * guesses at parts it can't parse.
 */
function parseUsAddress(address: string): Node {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length !== 3) return { streetAddress: address };
  const [streetAddress, addressLocality, stateZip] = parts;
  const match = stateZip.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!match) return { streetAddress: address };
  return {
    streetAddress,
    addressLocality,
    addressRegion: match[1],
    postalCode: match[2],
    addressCountry: "US",
  };
}

function buildOrganization(ph: Record<string, string>): Node {
  const org: Node = {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "BoxHauls",
    url: `${SITE_URL}/`,
  };
  if (isResolvedValue(ph.LEGAL_NAME)) org.legalName = ph.LEGAL_NAME;
  if (isResolvedValue(ph.PHONE)) org.telephone = ph.PHONE;
  if (isResolvedValue(ph.ADDRESS)) {
    org.address = { "@type": "PostalAddress", ...parseUsAddress(ph.ADDRESS) };
  }
  if (isResolvedValue(ph.FOUNDER_NAME)) {
    org.founder = { "@type": "Person", name: ph.FOUNDER_NAME };
  }
  const sameAs = Object.entries(ph)
    .filter(([key, value]) => key.startsWith("SOCIAL.") && isResolvedValue(value))
    .map(([, value]) => value);
  if (sameAs.length) org.sameAs = sameAs;
  if (isResolvedValue(ph.PHONE) || isResolvedValue(ph.EMAIL)) {
    org.contactPoint = {
      "@type": "ContactPoint",
      ...(isResolvedValue(ph.PHONE) ? { telephone: ph.PHONE } : {}),
      ...(isResolvedValue(ph.EMAIL) ? { email: ph.EMAIL } : {}),
      contactType: "customer service",
      ...(isResolvedValue(ph.METRO) ? { areaServed: ph.METRO } : {}),
      availableLanguage: ["en", "es"],
    };
  }
  return org;
}

function buildBreadcrumbList(entry: SitemapEntry): Node {
  const crumbs = getBreadcrumbs(entry.url);
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

function buildWebSite(): Node {
  return {
    "@type": "WebSite",
    name: "BoxHauls",
    url: `${SITE_URL}/`,
    publisher: { "@id": ORG_ID },
  };
}

function buildService(entry: SitemapEntry, ph: Record<string, string>): Node {
  const node: Node = {
    "@type": "Service",
    name: substitute(entry.h1, entry.url),
    serviceType: substitute(entry.primary_query, entry.url),
    provider: { "@id": ORG_ID },
  };
  if (isResolvedValue(ph.METRO)) node.areaServed = { "@type": "City", name: ph.METRO };
  return node;
}

function buildOffer(ph: Record<string, string>): Node | null {
  if (!isResolvedValue(ph.BASE_FARE) || !isResolvedValue(ph.PER_MILE)) return null;
  const basePrice = Number(ph.BASE_FARE.replace(/[^0-9.]/g, ""));
  return {
    "@type": "Offer",
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: Number.isFinite(basePrice) ? basePrice : undefined,
      priceCurrency: "USD",
      unitText: `${ph.BASE_FARE} base fare plus ${ph.PER_MILE} per mile`,
    },
  };
}

function buildLocalBusiness(ph: Record<string, string>): Node {
  const node: Node = {
    "@type": ["LocalBusiness", "MovingCompany"],
    name: "BoxHauls",
    url: `${SITE_URL}/cities/${ph["metro-slug"] ?? ""}/`,
  };
  if (isResolvedValue(ph.ADDRESS)) {
    node.address = { "@type": "PostalAddress", ...parseUsAddress(ph.ADDRESS) };
  }
  if (isResolvedValue(ph.PHONE)) node.telephone = ph.PHONE;
  if (isResolvedValue(ph.METRO) && isResolvedValue(ph.RADIUS)) {
    node.areaServed = {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", address: ph.METRO },
      geoRadius: `${ph.RADIUS} mi`,
    };
  }
  return node;
}

function buildMobileApplication(): Node {
  return {
    "@type": "MobileApplication",
    name: "BoxHauls",
    applicationCategory: "TravelApplication",
    operatingSystem: "iOS, Android",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

function buildJobPosting(entry: SitemapEntry, ph: Record<string, string>): Node {
  const node: Node = {
    "@type": "JobPosting",
    title: substitute(entry.h1, entry.url),
    description: substitute(entry.primary_query, entry.url),
    employmentType: "CONTRACTOR",
    hiringOrganization: { "@id": ORG_ID },
  };
  // baseSalary omitted: driver pay is a per-trip revenue share, not a
  // publishable salary figure (map §14 {{DRIVER_SHARE}} is a percentage).
  if (isResolvedValue(ph.METRO)) {
    node.jobLocation = {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: ph.METRO },
    };
  }
  return node;
}

function buildFaqPage(faqs: { question: string; answer: string }[]): Node {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

function buildHowTo(entry: SitemapEntry, steps: { name: string; text: string }[]): Node {
  return {
    "@type": "HowTo",
    name: substitute(entry.h1, entry.url),
    step: steps.map((s) => ({ "@type": "HowToStep", name: s.name, text: s.text })),
  };
}

function buildArticle(entry: SitemapEntry, author: string | undefined, updated: string | undefined): Node {
  const node: Node = {
    "@type": "Article",
    headline: substitute(entry.h1, entry.url),
    publisher: { "@id": ORG_ID },
  };
  // A real named author with a bio is still pending (map §9 rule 8) — an
  // interim "BoxHauls team, reviewed by X" credit isn't a schema.org
  // Person, so it's recorded as plain text via creditText rather than a
  // fabricated Person node.
  if (author) node.creditText = substitute(author, entry.url);
  if (updated) {
    node.datePublished = updated;
    node.dateModified = updated;
  }
  return node;
}

function buildContactPoint(ph: Record<string, string>): Node {
  return {
    "@type": "ContactPoint",
    ...(isResolvedValue(ph.PHONE) ? { telephone: ph.PHONE } : {}),
    ...(isResolvedValue(ph.EMAIL) ? { email: ph.EMAIL } : {}),
    contactType: "customer service",
    ...(isResolvedValue(ph.METRO) ? { areaServed: ph.METRO } : {}),
    availableLanguage: ["en", "es"],
  };
}

export interface SchemaContent {
  faqs?: { question: string; answer: string }[];
  howToSteps?: { name: string; text: string }[];
  author?: string;
  updated?: string;
}

/**
 * Builds one JSON-LD @graph per page from the sitemap entry's "schema"
 * array + docs/placeholders.json (map §11) + that page's real content
 * (src/content/pages/*.mdx, if it exists yet — see src/lib/content.ts).
 * Organization (@id #organization) and BreadcrumbList are included on
 * every page regardless of whether the entry's schema array lists them.
 *
 * FAQPage / HowTo / Article all require `content` to supply the matching
 * data (faqs / howToSteps / author+updated) — a page whose real copy
 * hasn't been written yet (most of Phase 2/3, or a Phase-1 page still
 * pending) simply doesn't get that node, rather than emitting structured
 * data with no visible content to mirror (map §11: "Never emit FAQPage
 * whose questions are not visible on the page").
 *
 * Person is still built only for /about/ ({{FOUNDER_NAME}} is a resolved
 * fact, not freeform copy) — a guide's byline is interim text ("BoxHauls
 * team, reviewed by X"), not a real named Person, so it's recorded on the
 * Article node as creditText instead (see buildArticle).
 */
export function buildSchema(entry: SitemapEntry, content?: SchemaContent | null): Node {
  const ph = getFlatPlaceholders();
  const graph: Node[] = [buildOrganization(ph), buildBreadcrumbList(entry)];

  for (const type of entry.schema) {
    switch (type) {
      case "Organization":
      case "BreadcrumbList":
        break; // always included above
      case "WebSite":
        graph.push(buildWebSite());
        break;
      case "Service":
        graph.push(buildService(entry, ph));
        break;
      case "Offer": {
        const offer = buildOffer(ph);
        if (offer) graph.push(offer);
        break;
      }
      case "LocalBusiness":
        graph.push(buildLocalBusiness(ph));
        break;
      case "MobileApplication":
        graph.push(buildMobileApplication());
        break;
      case "JobPosting":
        graph.push(buildJobPosting(entry, ph));
        break;
      case "ContactPoint":
        graph.push(buildContactPoint(ph));
        break;
      case "Person":
        if (entry.url === "/about/" && isResolvedValue(ph.FOUNDER_NAME)) {
          graph.push({ "@type": "Person", name: ph.FOUNDER_NAME, jobTitle: "Founder", worksFor: { "@id": ORG_ID } });
        }
        // Guide-author Person nodes need a real named byline, not yet available.
        break;
      case "FAQPage":
        if (content?.faqs?.length) graph.push(buildFaqPage(content.faqs));
        break;
      case "HowTo":
        if (content?.howToSteps?.length) graph.push(buildHowTo(entry, content.howToSteps));
        break;
      case "Article":
        if (content?.author || content?.updated) graph.push(buildArticle(entry, content?.author, content?.updated));
        break;
      default:
        break;
    }
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
