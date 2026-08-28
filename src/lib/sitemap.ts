import fs from "node:fs";
import path from "node:path";
import { substitute } from "./placeholders";

export interface SitemapEntry {
  url: string;
  h1: string;
  primary_query: string;
  secondary_queries: string[];
  links_to: string[];
  schema: string[];
  content_blocks: string;
  cluster: string;
  page_type: string;
  phase: number;
  template: string;
}

interface SitemapFile {
  brand: string;
  domain: string;
  version: string;
  pages: SitemapEntry[];
  redirects: { from: string; to: string }[];
}

let cached: SitemapFile | null = null;
let resolvedCache: SitemapEntry[] | null = null;

function load(): SitemapFile {
  if (!cached) {
    const filePath = path.resolve(process.cwd(), "docs/sitemap.json");
    cached = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return cached!;
}

export function getSitemap(): SitemapFile {
  return load();
}

/** Raw sitemap entries — url and links_to may still contain {{tokens}}. */
export function getPages(): SitemapEntry[] {
  return load().pages;
}

/**
 * Sitemap entries with url and links_to resolved through
 * docs/placeholders.json (e.g. /cities/{{metro-slug}}/ -> /cities/fresno/).
 * This is the single place that resolution happens — routes, breadcrumbs,
 * schema, and internal-linking components all read from here so a target
 * URL always matches the route that was actually built.
 */
export function getResolvedPages(): SitemapEntry[] {
  if (!resolvedCache) {
    resolvedCache = getPages().map((entry) => ({
      ...entry,
      url: substitute(entry.url, entry.url),
      links_to: entry.links_to.map((href) => substitute(href, entry.url)),
    }));
  }
  return resolvedCache;
}

export function getResolvedEntryByUrl(url: string): SitemapEntry | undefined {
  return getResolvedPages().find((p) => p.url === url);
}

export function getResolvedCluster(cluster: string): SitemapEntry[] {
  return getResolvedPages().filter((p) => p.cluster === cluster);
}
