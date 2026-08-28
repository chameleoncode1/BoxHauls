import { visit } from "unist-util-visit";
import type { Root, Text } from "mdast";
import type { VFile } from "vfile";
import { substitute } from "./placeholders";

/**
 * Lets placeholders from docs/placeholders.json work inside MDX body text
 * (src/content/pages) the same way they already work in sitemap entry
 * fields — so a fact like the base fare stays consistent across every
 * page that quotes it and updates automatically if placeholders.json
 * changes, rather than being hand-typed and left to drift. Unresolved
 * TODO values render the same visible [TODO: KEY] marker used elsewhere.
 *
 * Uses [[KEY]], not {{KEY}}: MDX reserves {curly braces} for JS
 * expressions, so `{{METRO}}` in an .mdx file is parsed as the JSX
 * expression `{ {METRO} }` (a "METRO is not defined" runtime error)
 * before any plain-text mdast node exists for a remark plugin to see.
 * [[KEY]] isn't CommonMark syntax, so it survives as ordinary text; this
 * plugin translates it to {{KEY}} and hands off to the same substitute()
 * used everywhere else in the site.
 */
const BRACKET_TOKEN_RE = /\[\[([A-Za-z0-9_.-]+)\]\]/g;

export function remarkSubstitutePlaceholders() {
  return (tree: Root, file: VFile) => {
    const pageUrl = String(file.path ?? file.history?.[0] ?? "unknown content file");
    visit(tree, "text", (node: Text) => {
      if (node.value.includes("[[")) {
        const asDoubleCurly = node.value.replace(BRACKET_TOKEN_RE, (_match, key: string) => `{{${key}}}`);
        node.value = substitute(asDoubleCurly, pageUrl);
      }
    });
  };
}
