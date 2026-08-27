import fs from "node:fs";
import path from "node:path";

type PlaceholdersFile = Record<string, unknown>;

let cached: PlaceholdersFile | null = null;
let flatCache: Record<string, string> | null = null;

// pageUrl -> set of placeholder keys rendered as TODO on that page
const todos = new Map<string, Set<string>>();

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

const TOKEN_RE = /\{\{([A-Za-z0-9_.-]+)\}\}/g;

/**
 * Replaces every {{KEY}} in `text` with its resolved value from
 * docs/placeholders.json. A value beginning with "TODO" renders as a
 * visible marker instead of the raw fact (CLAUDE.md rule #2) and is
 * recorded against `pageUrl` for docs/TODO.md. A key with no entry at
 * all in placeholders.json fails the build — a silently missing fact
 * is worse than a loud one.
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
      recordTodo(pageUrl, key);
      return `[TODO: ${key}]`;
    }
    return raw;
  });
}

function recordTodo(pageUrl: string, key: string) {
  if (!todos.has(pageUrl)) todos.set(pageUrl, new Set());
  todos.get(pageUrl)!.add(key);
}

export function getTodos(): Map<string, Set<string>> {
  return todos;
}

export function writeTodoFile(outPath: string) {
  const lines = [
    "# TODO",
    "",
    "Auto-generated at build time (src/lib/placeholders.ts). Every page that rendered an unresolved `{{PLACEHOLDER}}` is listed below, grouped by page. Fill the value in docs/placeholders.json and rebuild to clear an entry.",
    "",
  ];
  const sortedPages = [...todos.keys()].sort();
  if (sortedPages.length === 0) {
    lines.push("None — every placeholder used on a built page is resolved.");
  }
  for (const page of sortedPages) {
    lines.push(`## ${page}`);
    for (const key of [...todos.get(page)!].sort()) {
      lines.push(`- [ ] \`{{${key}}}\``);
    }
    lines.push("");
  }
  fs.writeFileSync(outPath, lines.join("\n"));
}
