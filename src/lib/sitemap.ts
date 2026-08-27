import fs from "node:fs";
import path from "node:path";

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

export function getPages(): SitemapEntry[] {
  return load().pages;
}

export function getEntryByUrl(url: string): SitemapEntry | undefined {
  return getPages().find((p) => p.url === url);
}

export function getCluster(cluster: string): SitemapEntry[] {
  return getPages().filter((p) => p.cluster === cluster);
}
