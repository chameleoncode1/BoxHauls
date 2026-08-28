import { visit } from "unist-util-visit";
import type { Root, Text, Link } from "mdast";
import type { VFile } from "vfile";
import { substituteBrackets } from "./placeholders";

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
 * [[KEY]] isn't CommonMark syntax, so it survives as ordinary text.
 *
 * Also substitutes inside link *destinations* — `[text]([[KEY]])` — not
 * just visible text. A link's URL is a `link` node's `.url` property,
 * not a `text` node, so it's invisible to a plain text-node visitor;
 * without this, the token would pass through unsubstituted and the
 * rendered href would literally be the string "[[KEY]]". This matters
 * for e.g. a long external URL (an insurance partner's tracked link)
 * that's cleaner to keep in placeholders.json than hand-pasted into
 * prose.
 */
export function remarkSubstitutePlaceholders() {
  return (tree: Root, file: VFile) => {
    const pageUrl = String(file.path ?? file.history?.[0] ?? "unknown content file");
    visit(tree, "text", (node: Text) => {
      if (node.value.includes("[[")) {
        node.value = substituteBrackets(node.value, pageUrl);
      }
    });
    visit(tree, "link", (node: Link) => {
      if (node.url.includes("[[")) {
        node.url = substituteBrackets(node.url, pageUrl);
      }
    });
  };
}
