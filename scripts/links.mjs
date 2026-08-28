// Real link checker (kickoff Prompt 3 item 4): crawls dist/ for every
// <a href> and confirms the target resolves to an actual file on disk —
// a page (index.html) or a static asset (OG image, sitemap.xml, robots.txt,
// built CSS/JS). External links, mailto:, and tel: are out of scope (this
// checks internal links only, per the kickoff doc).
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const distDir = path.resolve(cwd, "dist");
const SITE = "https://boxhauls.com";

if (!fs.existsSync(distDir)) {
  console.error("links: dist/ not found — run `npm run build` first.");
  process.exit(1);
}

function walkHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtmlFiles(full));
    else if (entry.name === "index.html") out.push(full);
  }
  return out;
}

const ANCHOR_RE = /<a\b[^>]*\bhref="([^"]+)"/gi;

function pageUrlFor(file) {
  const rel = path.relative(distDir, path.dirname(file)).split(path.sep).filter(Boolean).join("/");
  return rel === "" ? "/" : `/${rel}/`;
}

function targetExists(pathname) {
  if (pathname === "/") return fs.existsSync(path.join(distDir, "index.html"));
  const trimmed = pathname.replace(/^\/|\/$/g, "");
  // A page route (dist/<path>/index.html) or a static file served at
  // that exact path (dist/<path> — e.g. /sitemap.xml, /robots.txt,
  // /og/*.png, /_astro/*).
  return fs.existsSync(path.join(distDir, trimmed, "index.html")) || fs.existsSync(path.join(distDir, trimmed));
}

const htmlFiles = walkHtmlFiles(distDir);
const broken = [];
let checkedCount = 0;

for (const file of htmlFiles) {
  const sourceUrl = pageUrlFor(file);
  const html = fs.readFileSync(file, "utf-8");
  let m;
  ANCHOR_RE.lastIndex = 0;
  while ((m = ANCHOR_RE.exec(html))) {
    let href = m[1];
    if (href.startsWith(SITE)) href = href.slice(SITE.length) || "/";
    if (!href.startsWith("/") || href.startsWith("//")) continue; // external, mailto:, tel:
    const pathname = href.split(/[?#]/)[0];
    checkedCount++;
    if (!targetExists(pathname)) {
      broken.push({ source: sourceUrl, target: pathname });
    }
  }
}

if (broken.length === 0) {
  console.log(`links: ${checkedCount} internal links checked across ${htmlFiles.length} pages, 0 broken.`);
  process.exit(0);
}

console.log(`links: ${broken.length} broken internal link(s) found (of ${checkedCount} checked):\n`);
for (const { source, target } of broken) {
  console.log(`  ${source} -> ${target} (not found)`);
}
process.exit(1);
