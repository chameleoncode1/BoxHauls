// Per-template OG image, generated at build time from the page title and
// brand (kickoff Prompt 2 item 6). One shared visual design is used across
// all 11 templates — "per-template" here means every page gets a correctly
// titled image, not that each template needs distinct art direction.
//
// Built as an SVG string, rasterized to PNG with sharp (already a
// transitive Astro/image dependency, so this adds no new package).
import type { APIRoute, GetStaticPaths } from "astro";
import sharp from "sharp";
import { getResolvedPages, type SitemapEntry } from "../../lib/sitemap";
import { substitute } from "../../lib/placeholders";

export const getStaticPaths: GetStaticPaths = () => {
  return getResolvedPages().map((entry) => {
    const trimmed = entry.url.replace(/^\/|\/$/g, "");
    return {
      params: { slug: trimmed === "" ? "home" : trimmed },
      props: { entry },
    };
  });
};

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const WIDTH = 1200;
const HEIGHT = 630;

function buildSvg(title: string): string {
  const lines = wrapText(title, 30).slice(0, 4);
  const lineHeight = 68;
  const startY = HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2 - 20;

  const tspans = lines
    .map((line, i) => `<tspan x="80" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#111111"/>
    <rect width="${WIDTH}" height="10" fill="#ce0718"/>
    <text x="80" y="120" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="34" font-weight="800">
      <tspan fill="#ffffff">Box</tspan><tspan fill="#ce0718">Hauls</tspan>
    </text>
    <text font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${tspans}</text>
    <text x="80" y="${HEIGHT - 60}" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="26" fill="#a1a1aa">boxhauls.com</text>
  </svg>`;
}

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: SitemapEntry };
  const title = substitute(entry.h1, entry.url);
  const svg = buildSvg(title);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
};
