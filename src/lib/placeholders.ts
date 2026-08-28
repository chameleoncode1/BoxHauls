import fs from "node:fs";
import path from "node:path";

type PlaceholdersFile = Record<string, unknown>;

let cached: PlaceholdersFile | null = null;
let flatCache: Record<string, string> | null = null;

function load(): PlaceholdersFile {
  if (!cached) {
    const filePath = path.resolve(process.cwd(), "docs/placeholders.json");
    cached = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return cached!;
}

/**
 * Flattens placeholders.json one level deep (top-level string values, plus
 * string values nested one object deep, e.g. SOCIAL.instagram). Non-string
 * leaves (arrays, deeper nesting — e.g. LOCAL_ENTITIES) are not template
 * tokens and are skipped; pages that need that data import placeholders.json
 * directly instead of going through substitute().
 */
function flatten(): Record<string, string> {
  if (flatCache) return flatCache;
  const data = load();
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("_")) continue;
    if (typeof value === "string") {
      flat[key] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (typeof subValue === "string") {
          flat[`${key}.${subKey}`] = subValue;
        }
      }
    }
  }
  flatCache = flat;
  return flat;
}

/** Flattened placeholders.json (see `flatten` above) for callers that need
 * to read a raw resolved value directly rather than via a {{token}} string
 * (e.g. schema.ts building structured JSON-LD fields). */
export function getFlatPlaceholders(): Record<string, string> {
  return flatten();
}

/** The full parsed placeholders.json, including nested/array values
 * (e.g. LOCAL_ENTITIES) that `flatten()` intentionally skips. */
export function getRawPlaceholders(): PlaceholdersFile {
  return load();
}

export function isResolvedValue(value: string | undefined): value is string {
  return typeof value === "string" && !value.startsWith("TODO");
}

const TOKEN_RE = /\{\{([A-Za-z0-9_.-]+)\}\}/g;

/**
 * Replaces every {{KEY}} in `text` with its resolved value from
 * docs/placeholders.json. A value beginning with "TODO" renders as a
 * visible `[TODO: KEY]` marker instead of the raw fact (CLAUDE.md rule
 * #2) — scripts/write-todo.mjs scans the built HTML for that marker
 * after `npm run build` to produce docs/TODO.md. A key with no entry at
 * all in placeholders.json fails the build — a silently missing fact is
 * worse than a loud one.
 */
export function substitute(text: string, pageUrl: string): string {
  const flat = flatten();
  return text.replace(TOKEN_RE, (_match, key: string) => {
    const raw = flat[key];
    if (raw === undefined) {
      throw new Error(
        `Unresolved placeholder {{${key}}} on ${pageUrl} — add it to docs/placeholders.json (CLAUDE.md rule #2: never invent facts).`
      );
    }
    if (raw.startsWith("TODO")) {
      return `[TODO: ${key}]`;
    }
    return raw;
  });
}
