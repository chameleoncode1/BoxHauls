// Real QA gate (kickoff Prompt 3 / CLAUDE.md). Reads the static files in
// dist/ directly rather than spinning up a server and curling it — for a
// fully static build there is no server processing in between, so the
// bytes on disk ARE exactly what a curl request would receive. This is
// the same spirit as CLAUDE.md hard rule #4 ("verify with curl, not by
// trusting the framework"): it checks the actual rendered output, not
// Astro's dev-time behavior.
//
// Runs every check below for every Phase-1 route (sitemap "phase": 1).
// Prints a table and exits non-zero on any hard failure. TODO markers
// are listed per page as information, never as a failure.
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const distDir = path.resolve(cwd, "dist");
const SITE = "https://boxhauls.com";

const sitemapData = JSON.parse(fs.readFileSync(path.resolve(cwd, "docs/sitemap.json"), "utf-8"));
const allPages = sitemapData.pages;

if (!fs.existsSync(distDir)) {
  console.error("qa: dist/ not found — run `npm run build` first.");
  process.exit(1);
}

// ------------------------------------------------------------- placeholders
const placeholders = JSON.parse(fs.readFileSync(path.resolve(cwd, "docs/placeholders.json"), "utf-8"));
const flatPlaceholders = {};
for (const [key, value] of Object.entries(placeholders)) {
  if (key.startsWith("_")) continue;
  if (typeof value === "string") flatPlaceholders[key] = value;
  else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string") flatPlaceholders[`${key}.${k}`] = v;
    }
  }
}
function substitute(text) {
  return text.replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, (_m, key) => {
    const raw = flatPlaceholders[key];
    if (raw === undefined || raw.startsWith("TODO")) return null; // caller decides
    return raw;
  });
}
function resolvedUrl(rawUrl) {
  const out = substitute(rawUrl);
  return out === null ? null : out;
}

// ------------------------------------------------------------------- dist IO
function distFileFor(url) {
  const rel = url.replace(/^\/|\/$/g, "");
  return path.join(distDir, rel, "index.html");
}
function readDist(url) {
  const file = distFileFor(url);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : null;
}

// --------------------------------------------------------------- click graph
// BFS over every page's dist output (not just Phase-1) since a Phase-1
// page can be reached through a hub that itself isn't Phase-1.
const ANCHOR_RE = /<a\b[^>]*\bhref="([^"]+)"/gi;

function extractAnchorPaths(html) {
  const out = [];
  let m;
  ANCHOR_RE.lastIndex = 0;
  while ((m = ANCHOR_RE.exec(html))) {
    let href = m[1];
    if (href.startsWith(SITE)) href = href.slice(SITE.length) || "/";
    if (!href.startsWith("/") || href.startsWith("//")) continue; // external, mailto:, tel:
    out.push(href.split(/[?#]/)[0]);
  }
  return out;
}

const knownUrls = new Set(allPages.map((p) => resolvedUrl(p.url)).filter(Boolean));
const adjacency = new Map(); // url -> Set(url)
for (const p of allPages) {
  const url = resolvedUrl(p.url);
  if (!url) continue;
  const html = readDist(url);
  if (!html) continue;
  const targets = new Set(extractAnchorPaths(html).filter((h) => knownUrls.has(h)));
  adjacency.set(url, targets);
}

function bfsDistances(start) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const u = queue.shift();
    for (const v of adjacency.get(u) ?? []) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(u) + 1);
        queue.push(v);
      }
    }
  }
  return dist;
}
const clickDistances = bfsDistances("/");

// ------------------------------------------------------------ banned phrases
const BANNED_PHRASES = [
  "logistics",
  "solution",
  "on-demand ecosystem",
  "cargo",
  "freight",
  "buddy with a truck",
  "friend with a truck",
  "too big for my car",
  "welcome to",
  "truck-n-go",
  "lovable",
];
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const bannedPatterns = BANNED_PHRASES.map((p) => ({ phrase: p, re: new RegExp(`\\b${escapeRegExp(p)}\\b`, "i") }));

// -------------------------------------------------------- deferred schema
// FAQPage / HowTo / Article are built by schema.ts from real content
// (src/content/pages/*.mdx) once it exists for a page — a Phase-1 page
// that requests one of these but has no content yet is failing for a
// real reason (it needs writing), not a permanently-deferred one. Person
// stays deferred except on /about/: a guide's byline is interim text
// ("BoxHauls team, reviewed by X"), not a real named Person entity, until
// one exists. See src/lib/schema.ts's docstring for the full rationale.
function isDeferredSchemaType(type, entryUrl) {
  if (type === "Person" && entryUrl !== "/about/") return true;
  return false;
}

// --------------------------------------------------------------- the checks
function checkPage(entry) {
  const url = resolvedUrl(entry.url);
  const result = { url, failures: [], warnings: [], todos: [] };

  if (!url) {
    result.failures.push("url itself has an unresolved placeholder");
    return result;
  }

  const html = readDist(url);
  if (!html) {
    result.failures.push(`no built file at ${distFileFor(url)}`);
    return result;
  }

  // exactly one H1
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) result.failures.push(`expected exactly one <h1>, found ${h1Count}`);

  // JSON-LD parses and contains every non-deferred requested type
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ldMatch) {
    result.failures.push("no JSON-LD <script> found");
  } else {
    let graph;
    try {
      graph = JSON.parse(ldMatch[1]);
    } catch (e) {
      result.failures.push(`JSON-LD does not parse: ${e.message}`);
    }
    if (graph) {
      const presentTypes = new Set(
        (graph["@graph"] ?? []).flatMap((node) => (Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]))
      );
      for (const requested of entry.schema) {
        if (presentTypes.has(requested)) continue;
        if (isDeferredSchemaType(requested, url)) {
          result.warnings.push(`schema type "${requested}" requested but deferred to Prompt 4 (no visible content yet)`);
        } else {
          result.failures.push(`schema type "${requested}" requested but not emitted`);
        }
      }

      // BreadcrumbList matches the path
      const breadcrumbNode = (graph["@graph"] ?? []).find((n) =>
        Array.isArray(n["@type"]) ? n["@type"].includes("BreadcrumbList") : n["@type"] === "BreadcrumbList"
      );
      if (!breadcrumbNode) {
        result.failures.push("no BreadcrumbList node in JSON-LD");
      } else {
        const items = breadcrumbNode.itemListElement ?? [];
        const segments = url.split("/").filter(Boolean);
        if (items.length !== segments.length + 1) {
          result.failures.push(`BreadcrumbList has ${items.length} items, expected ${segments.length + 1} for ${url}`);
        }
        const last = items[items.length - 1];
        if (last && last.item !== `${SITE}${url}`) {
          result.failures.push(`BreadcrumbList last item is ${last.item}, expected ${SITE}${url}`);
        }
      }
    }
  }

  // every links_to target appears as <a href> in the body
  for (const rawTarget of entry.links_to) {
    const target = resolvedUrl(rawTarget);
    if (!target) {
      result.failures.push(`links_to target "${rawTarget}" has an unresolved placeholder`);
      continue;
    }
    if (!html.includes(`href="${target}"`)) {
      result.failures.push(`links_to target ${target} not found as <a href> in body`);
    }
  }

  // no unresolved {{...}}
  if (html.includes("{{")) result.failures.push("unresolved {{...}} found in rendered HTML");

  // audience isolation in body copy (CLAUDE.md #7 / map §2): rider pages
  // never link to /drive/, driver pages never link to /services/. Scoped
  // to the hand-authored <article> (real MDX content), not the whole
  // page — the footer intentionally carries the one permitted /drive/
  // link on rider pages. A target already listed in this page's own
  // links_to is exempt: the map itself sanctions it for this specific
  // page (e.g. /app/'s required "driver app link"), which is a
  // deliberate exception, not a violation.
  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/);
  if (articleMatch) {
    const articleHtml = articleMatch[1];
    const isDriverPage = entry.template === "driver";
    const sanctionedTargets = new Set(entry.links_to.map(resolvedUrl).filter(Boolean));
    const articleHrefs = [...articleHtml.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((m) => m[1]);
    for (const href of articleHrefs) {
      if (sanctionedTargets.has(href)) continue;
      if (!isDriverPage && href.startsWith("/drive/")) {
        result.failures.push(`rider page links to ${href} in body copy, not in this page's links_to (CLAUDE.md #7)`);
      }
      if (isDriverPage && href.startsWith("/services/")) {
        result.failures.push(`driver page links to ${href} in body copy, not in this page's links_to (CLAUDE.md #7)`);
      }
    }
  }

  // banned phrases absent (excluding the qa:ignore-marked scaffolding box
  // that quotes docs/sitemap.json's own planning text verbatim — see the
  // comment around it in src/layouts/BaseLayout.astro). Scans the raw HTML,
  // not just tag-stripped visible text — a naive tag-strip would silently
  // skip attribute values (meta description, og:description) and JSON-LD,
  // both of which also carry entry.primary_query and can just as easily
  // leak a banned word into user- or search-engine-facing text.
  const withoutScaffolding = html.replace(/<!-- qa:ignore-start[\s\S]*?-->[\s\S]*?<!-- qa:ignore-end -->/g, "");
  for (const { phrase, re } of bannedPatterns) {
    if (re.test(withoutScaffolding)) result.failures.push(`banned phrase found: "${phrase}"`);
  }

  // canonical is absolute and self-referencing
  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canonicalMatch) {
    result.failures.push("no canonical <link> found");
  } else if (canonicalMatch[1] !== `${SITE}${url}`) {
    result.failures.push(`canonical is ${canonicalMatch[1]}, expected ${SITE}${url}`);
  }

  // route is in sitemap.xml
  const sitemapXmlPath = path.join(distDir, "sitemap.xml");
  const sitemapXml = fs.existsSync(sitemapXmlPath) ? fs.readFileSync(sitemapXmlPath, "utf-8") : "";
  if (!sitemapXml.includes(`<loc>${SITE}${url}</loc>`)) {
    result.failures.push("route not present in sitemap.xml");
  }

  // reachable within 3 clicks from /
  const clicks = clickDistances.get(url);
  if (clicks === undefined) {
    result.failures.push("unreachable from / via <a href> links (orphan)");
  } else if (clicks > 3) {
    result.failures.push(`${clicks} clicks from / (must be <= 3)`);
  }

  // TODO markers — informational only, never a failure
  const todoMatches = [...html.matchAll(/\[TODO: ([A-Za-z0-9_.-]+)\]/g)];
  result.todos = [...new Set(todoMatches.map((m) => m[1]))];

  return result;
}

// --------------------------------------------------------------------- run
const phase1Pages = allPages.filter((p) => p.phase === 1);
const results = phase1Pages.map(checkPage);

const table = results.map((r) => ({
  url: r.url ?? "(unresolved)",
  status: r.failures.length ? "FAIL" : r.warnings.length ? "WARN" : "PASS",
  failures: r.failures.length,
  warnings: r.warnings.length,
  todos: r.todos.length,
}));
console.table(table);

const failing = results.filter((r) => r.failures.length > 0 || r.warnings.length > 0);
if (failing.length) {
  console.log(`\n${failing.length} page(s) with failures or warnings:\n`);
  for (const r of failing) {
    console.log(`${r.url}`);
    for (const f of r.failures) console.log(`  FAIL  ${f}`);
    for (const w of r.warnings) console.log(`  warn  ${w}`);
  }
}

const withTodos = results.filter((r) => r.todos.length > 0);
if (withTodos.length) {
  console.log(`\n${withTodos.length} page(s) with TODO markers (informational, see docs/TODO.md):\n`);
  for (const r of withTodos) console.log(`  ${r.url}: ${r.todos.map((k) => `{{${k}}}`).join(", ")}`);
}

const totalWarnings = results.reduce((n, r) => n + r.warnings.length, 0);
console.log(
  `\nqa: ${phase1Pages.length} Phase-1 pages checked, ${failing.length} failing, ${totalWarnings} deferred-schema warnings.`
);

process.exit(failing.length > 0 ? 1 : 0);
