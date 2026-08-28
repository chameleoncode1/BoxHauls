# Progress

## Status: kickoff Prompts 1-5 complete — full Phase-1 site + booking widget

## What shipped

**Scaffold (Prompt 1)** — Astro (static, TS, Tailwind, MDX, React for islands) generating all 194 sitemap routes from `docs/sitemap.json`, one of 11 template layouts per page, placeholder substitution with visible `[TODO: KEY]` markers.

**Layouts, schema, linking (Prompt 2)** — Real header/footer with structural audience isolation (driver pages never see rider nav or link to `/services/`; rider pages carry one `/drive/` link, footer-only), breadcrumbs, JSON-LD (`Organization`/`BreadcrumbList` always; `Service`/`Offer`/`LocalBusiness`/`MobileApplication`/`JobPosting`/`ContactPoint` from resolved placeholders), title formulas per map §4.1, per-page OG images.

**Technical spec + QA gate (Prompt 3)** — `sitemap.xml`, `robots.txt`, redirect config, `scripts/qa.mjs` (structural checks + audience isolation + banned phrases), `scripts/links.mjs` (broken-link crawler), analytics stub (`src/components/Analytics.astro`), Lighthouse config.

**Red/white/black rebrand** — Palette sampled directly from the real logo file (`#ce0718` red, `#111111` near-black), header/footer/favicon/OG images updated. Surfaced two real content-pipeline bugs (frontmatter never ran through placeholder substitution; markdown links in FAQ text rendered literally) — both fixed and verified across every page written to that point.

**Content (Prompt 4) — all 65 Phase-1 pages, by cluster:**

| Cluster | Pages | Notes |
|---|---|---|
| core | 17 | Home, how-it-works, pricing hub + truck-sizes + fees, trust cluster (4), about, contact, press, FAQ, reviews, app, cities hub |
| pricing | 5 | Couch, mattress, refrigerator, washer/dryer, dump run — worked examples computed from the real formula, not invented |
| services | 21 | 4 hubs (furniture, small moves, appliance, junk removal) + Phase-1 spokes |
| city | 1 | `/cities/fresno/` — real local blocks (transfer stations, retailer order, Operation Clean Up); driver profiles/reviews/trip-pricing use honest empty states since that data doesn't exist yet |
| drive | 10 | Hub, requirements, earnings (real payout math), insurance, payouts, equipment, safety, FAQ, apply, `/drive/fresno/` |
| guides | 8 | 40-item will-it-fit table, how-to-move-a-couch, rent-vs-hire, what-to-expect, Marketplace guide, 2 Fresno-local guides, damage guide |
| legal | 3 | Terms, privacy, driver agreement — structural section outlines only; not drafted as binding legal text (outside what this session is qualified to do) |

**Two real business facts resolved post-Prompt-4** (from you, not invented): `HELPER_FEE` = $17, applied everywhere with the required availability caveat ("depends on whether the driver has someone available, not guaranteed"); driver rideshare/delivery insurance requirement, with an Insurify comparison-quote link on `/drive/insurance-and-liability/`. The link needed a real fix to `src/lib/remarkSubstitutePlaceholders.ts` — the existing remark plugin only substituted placeholders in text nodes, not link destinations, so `[text]([[TOKEN]])` didn't work until the plugin was extended to visit `link` nodes too.

**Booking widget (Prompt 5)** — `src/components/BookingWidget.tsx`, a React island mounted on `/` and `/book/?item=X&tier=Y` (every pricing-page CTA already pointed here). Real address inputs, item/tier pickers (tier auto-suggests from item), helper add-on with the availability caveat inline, price breakdown from a mock pricing function (`src/lib/mockPricing.ts` — real formula, mock/deterministic distance, clearly commented as a stand-in for real geocoding). No driver cards, ETAs, ratings, or revenue split. Submitting shows an honest "preview" message, not a fake booking success. Wired to the existing analytics stub's `price_shown`/`booking_started` events (not `booking_completed` — nothing real completes yet). `docs/LAUNCH.md` written: DNS cutover, Search Console, redirect test commands, GBP NAP string, TODO-by-page summary. `/es/` for `/drive/` deliberately **not** scaffolded — `/es/drive/*` isn't in `docs/sitemap.json`, and CLAUDE.md's hard rule #1 means routes come from the sitemap via `build_map.py`, not hand-created; documented as an open Phase-2 item instead of speculative code.

Found via actual browser testing (not just a green build): `/book/` is a **static** route, so `Astro.url.searchParams` in its frontmatter is always empty regardless of the visitor's real query string — the item/tier pre-fill had to move entirely client-side into the React component, and even the first client-side attempt (a `useState` lazy initializer) had a hydration-timing bug that a `useEffect` fixed properly.

**Verification, every cluster/feature:** `npm run qa` (65/65 Phase-1 pages passing), `npm run links` (6656 internal links checked across 195 pages, 0 broken), `astro check` (0 errors), visual spot-checks and interactive testing in the dev server (typed real addresses into the booking widget and confirmed the computed price, not just that the form rendered).

## Known data gaps

See `docs/TODO.md` for the full current list, grouped by page, auto-generated by `scripts/write-todo.mjs` after every build. Highest-impact remaining: `INSURANCE_CARRIER`/`COVERAGE_LIMIT`, the Fresno-local facts (landfill/CARTS hours and fees, Operation Clean Up schedule), driver requirements (`MIN_DRIVER_AGE`, `MIN_TRUCK_YEAR`), and `LEGAL_REVIEW_STATUS` (needs an actual attorney, not fillable by this session). The business plan document provided earlier (`BoxHauls_Business_Plan_and_Founders_Agreement.docx`) is a legal/governance template and resolved zero of these.

One flagged, unresolved: the `x` (Twitter) social handle in `placeholders.json` is `https://x.com/Truck_N_Go` — the old brand name is literally in the URL, published in the site's own `Organization.sameAs` JSON-LD. Not something to silently fix; worth renaming before launch.

## Phase 2 progress (started this session)

| Sub-cluster | Pages | Notes |
|---|---|---|
| Retailer spokes | 10 | Store pickup pages for Costco, Home Depot, Lowe's, Living Spaces, Ashley, Big Lots, Walmart, Target, Mattress Firm, IKEA (honestly reframed — no Fresno store) |
| Marketplace spokes | 4 | Facebook Marketplace, Craigslist, OfferUp, Nextdoor |
| Remaining pricing | 23 | All remaining `/pricing/cost-to-*` item pages plus the hourly-vs-per-trip comparison page; pricing hub's "By item" list expanded to link all 25 item pages across 4 categories |
| Remaining service spokes | 21 | furniture-delivery (thrift, estate-sale), small-moves (senior downsizing, small office, last-minute, in-building), appliance-delivery (dishwasher/range, water heater, freezer), junk-removal (yard waste, construction debris, e-waste, hot tub, estate cleanout, donation drop-off), and the new business-hauling hub + 5 spokes (pallet/bulk, jobsite material, property-manager turnovers, retail last-mile, restaurant/office equipment) |

Each sub-cluster: written, hub pages updated to link every child, `npm run qa` / `npm run links` / `astro check` run clean, visual spot-check in the dev server, committed separately.

## Not started

- **Real booking backend**: geocoding/routing, driver matching, payment processing — the widget is a UI stub with mock pricing, by design (kickoff Prompt 5's own instruction, no legacy component existed to port).
- **`GA4_MEASUREMENT_ID`**: still `TODO` — analytics events fire to the console in dev but nowhere real until this is resolved.
- **Rest of Phase 2**: `/compare/` cluster (13 pages, needs real competitor research), guides batches (32 pages), `/partners/` (8 pages), driver compare + guides (8 pages), Spanish `/es/` for `/drive/` and core pages. Routes already build as stubs; no real content yet.
- **Phase 3** (10 pages): real-trip pricing data page, neighborhood pages (Clovis first, gated), seasonal guides, second metro.
