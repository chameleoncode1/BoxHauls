/**
 * Frontmatter fields (faqs, howToSteps) are plain YAML strings, not run
 * through the MDX/remark pipeline that the page body gets — but they're
 * written with the same inline markdown (links, bold) the body uses, for
 * consistency. These two helpers handle the two places that text ends
 * up: rendered as real HTML on the page, and as plain text in the
 * FAQPage/HowTo JSON-LD (map §9 rule 7: schema must mirror the on-page
 * text exactly, and JSON-LD string fields are plain text, not markup).
 *
 * Deliberately minimal — links and bold only, since that's all this
 * content actually uses. Not a general markdown parser.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

/**
 * Renders inline markdown as an HTML string, for use with set:html. The
 * link class is hardcoded here (rather than relying on ambient .prose
 * styling) because Tailwind's build-time scanner can't see classes that
 * only ever exist inside a string injected at runtime via set:html.
 */
export function renderInlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(LINK_RE, '<a class="text-accent underline hover:no-underline" href="$2">$1</a>')
    .replace(BOLD_RE, "<strong>$1</strong>");
}

/** Strips inline markdown down to plain text, for JSON-LD string fields. */
export function stripInlineMarkdown(text: string): string {
  return text.replace(LINK_RE, "$1").replace(BOLD_RE, "$1");
}
