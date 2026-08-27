# BoxHauls — build plan

Source of truth: `CLAUDE.md`, `docs/topical-map.md`, `docs/sitemap.json`, `docs/placeholders.json`. This file records the implementation approach; it is not itself a spec — if it conflicts with those, they win.

## 1. Templates → layouts → components

Eleven `template` values appear in `docs/sitemap.json` (194 pages total: home 1, core 16, pricing 29, service-hub 5, service-spoke 51, city 2, compare 13, guide 52, driver 14, partners 8, legal 3). Each gets exactly one layout in `src/layouts/`, per CLAUDE.md's hard rule of one layout per template.

| Layout | Sitemap `template` | Pages | Distinguishing content blocks (map §4–8, §16) | Extra components |
|---|---|---|---|---|
| `HomeLayout` | home | / | Booking widget above the fold, trust badges, reviews module, 3-step how-it-works, 5 service tiles, app download | `BookingWidget` (React island) |
| `CoreLayout` | core | /how-it-works/, /pricing/, /pricing/truck-sizes/, /pricing/fees/, /trust/*, /about/, /contact/, /press/, /faq/, /reviews/, /app/, /cities/ | Varies per page (formula, tier table, fee table, FAQ, NAP) — rendered from `content_blocks` | `FAQBlock`, `NAPBlock` |
| `PricingLayout` | pricing | 29 cost-to-move-a-* pages | Answer-first price range, formula, 3/10/25-mi distance table, item attributes table, helper guidance, prep list, FAQs, book CTA | `DistanceTable`, `ItemAttributesTable`, `BookCTA` |
| `ServiceHubLayout` | service-hub | 5 hub pages | Definition sentence, who-uses-it, included/excluded, tier fit table, price example, spoke list, FAQs | `SpokeList`, `TierFitTable` |
| `ServiceSpokeLayout` | service-spoke | 51 spoke pages (retailer, marketplace, item-specific) | Scenario-specific attributes, hub backlink in first 200 words, price example | `BookCTA` |
| `CityLayout` | city | /cities/fresno/ (only gated page at launch) | Local blocks per §6.6/§16: transfer stations, bulky-pickup rules, retailer pickup lanes, university peaks — human-written, never templated | `LocalEntityBlock` |
| `CompareLayout` | compare | 13 pages | Criteria table (price, minimum, coverage, insurance, vetting, scheduling, helpers, app), dated facts | `CompareTable` |
| `GuideLayout` | guide | 52 pages | Author block, single inward core link, guide-cluster body (fit/howto/decision/marketplace/retail/local/scenario/trust/seasonal) | `AuthorBlock` |
| `DriverLayout` | driver | 14 pages under /drive/ | Earnings math using `{{DRIVER_SHARE}}`, requirements, equipment, safety — never links to /services/ | `EarningsCalc` |
| `PartnersLayout` | partners | 8 pages | Business-audience copy, links to /pricing/ and /trust/ allowed | — |
| `LegalLayout` | legal | 3 pages (terms, privacy, driver-agreement) | Plain document body | — |

Shared across every layout: `Header`, `Footer`, `Breadcrumbs`, `RelatedLinks` (3–5 same-cluster links), `BodyLinks` (renders each `links_to` target as a descriptive in-sentence anchor), JSON-LD `<script>` block from `src/lib/schema.ts`.

Audience isolation (map §2, CLAUDE.md #7) is enforced structurally: `Header`/`Footer` read the page's `cluster`/`url` to decide whether the driver link renders (rider footer only, never body) and `DriverLayout` never imports rider nav.

## 2. Data flow

```
docs/sitemap.json (194 entries: url, h1, primary_query, links_to, schema, content_blocks, cluster, page_type, phase, template)
        │
        ▼
src/pages/[...slug].astro   — getStaticPaths() maps every entry to a route (trailing slash, one route per url)
        │
        ├─→ picks layout component by entry.template
        ├─→ passes the sitemap entry + resolved placeholders as props
        ▼
src/layouts/<Template>Layout.astro
        │
        ├─→ renders content_blocks (stub in Prompt 1; real MDX body from
        │    src/content/pages/<url-as-path>.mdx once Prompt 4 content lands)
        ├─→ Breadcrumbs from the URL path
        ├─→ BodyLinks from links_to (anchor text = target's h1)
        ├─→ RelatedLinks from same cluster
        ▼
src/lib/schema.ts — buildSchema(entry, placeholders) → one JSON-LD @graph
        (Organization always; entry.schema[] selects the rest per map §11)
```

`build_map.py` remains the single source of truth for page inventory (CLAUDE.md hard rule #1): edit it, run `npm run map`, then build. `src/pages/[...slug].astro` never hand-lists routes.

## 3. Placeholder substitution

`src/lib/placeholders.ts` loads `docs/placeholders.json` at build time and exposes `substitute(text: string): string`:

- Replaces every `{{KEY}}` (and nested `{{metro-slug}}`, `{{neighborhood-slug}}`) with its resolved value.
- Any value whose *resolved* string starts with `TODO` is instead rendered as a visible `<span class="todo-marker">[TODO: KEY]</span>` and the (page url, key) pair is appended to `docs/TODO.md` during the build.
- A key present in a page's content but absent from `placeholders.json` fails the build (CLAUDE.md #2 — never invent facts, and a silently-missing placeholder is worse than a loud one).
- `docs/placeholders.json`'s `SOCIAL` object is walked the same way for `Organization.sameAs`.

This substitution runs in `[...slug].astro` before content reaches any layout, so layouts never see raw `{{...}}` tokens.

## 4. Phase 1 scope for this scaffold (Prompt 1)

Every route in `sitemap.json` builds today with a stub body (H1, content-blocks list, links_to list) so route count and structure are provable before real content or real layouts exist. Real layout structure lands in Prompt 2; the QA gate (`npm run qa`) becomes real in Prompt 3; real copy lands cluster-by-cluster in Prompt 4.
