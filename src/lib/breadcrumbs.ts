import { getResolvedEntryByUrl } from "./sitemap";
import { substitute } from "./placeholders";

export interface Crumb {
  name: string;
  url: string; // absolute
}

const SITE_URL = "https://boxhauls.com";

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Builds Home + one crumb per URL segment. A segment that is itself a
 * sitemap page (e.g. /services/furniture-delivery/) uses that page's H1;
 * a segment with no page of its own (e.g. "/services/", which doesn't
 * exist as a route — only its hubs do) falls back to a title-cased label.
 * Shared by the visual Breadcrumbs component and schema.ts's
 * BreadcrumbList so both always agree.
 */
export function getBreadcrumbs(resolvedUrl: string): Crumb[] {
  const segments = resolvedUrl.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ name: "Home", url: `${SITE_URL}/` }];

  let pathSoFar = "";
  for (const segment of segments) {
    pathSoFar += `/${segment}`;
    const url = `${pathSoFar}/`;
    const entry = getResolvedEntryByUrl(url);
    const name = entry ? substitute(entry.h1, entry.url) : titleCase(segment);
    crumbs.push({ name, url: `${SITE_URL}${url}` });
  }

  return crumbs;
}
