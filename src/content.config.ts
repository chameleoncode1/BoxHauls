import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Content per page (kickoff Prompt 4). The MDX body carries the flowing
// prose (including any markdown tables — distance tables, item
// attribute tables, criteria tables); frontmatter carries only the
// structured extras that must exactly mirror JSON-LD (map §9 rule 7:
// "FAQPage schema mirrors the on-page text exactly") or that schema.ts
// needs as discrete fields rather than parsed out of prose.
const pages = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/pages" }),
  schema: z.object({
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    howToSteps: z.array(z.object({ name: z.string(), text: z.string() })).optional(),
    // e.g. "BoxHauls team, reviewed by {{FOUNDER_NAME}}" — a real named
    // Person entity is deferred until one exists (see schema.ts).
    author: z.string().optional(),
    // "Prices/facts checked {month year}" per map §9 rule 9 (pricing,
    // compare, and local pages).
    updated: z.string().optional(),
  }),
});

export const collections = { pages };
