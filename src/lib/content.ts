import { getEntry, render, type CollectionEntry } from "astro:content";

/**
 * "/pricing/cost-to-move-a-couch/" -> "pricing/cost-to-move-a-couch"
 * "/" -> "index"
 * Matches src/content/pages/<url-as-path>.mdx (CLAUDE.md convention).
 */
export function contentIdFor(resolvedUrl: string): string {
  const trimmed = resolvedUrl.replace(/^\/|\/$/g, "");
  return trimmed === "" ? "index" : trimmed;
}

/**
 * Looks up and renders the MDX content for a page, if it exists yet.
 * Pages without real content (most of Phase 2/3, and any Phase-1 page
 * not yet written) return null — callers fall back to the
 * content_blocks stub.
 */
export async function getPageContent(resolvedUrl: string): Promise<{
  entry: CollectionEntry<"pages">;
  Content: Awaited<ReturnType<typeof render>>["Content"];
} | null> {
  const entry = await getEntry("pages", contentIdFor(resolvedUrl));
  if (!entry) return null;
  const { Content } = await render(entry);
  return { entry, Content };
}
