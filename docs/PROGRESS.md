# Progress

## Status: kickoff Prompts 1-5 complete — full Phase-1 site, all of Phase 2, 9/10 Phase-3 pages, and real-booking-backend Phase 1 (real geocoded pricing) — all live in production on boxhauls.com

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
| Guides | 31 | All 30 remaining guide spokes (fit, howto, decision, marketplace, retail, local, scenario, trust) plus the `/guides/` hub, which resolved 4 pre-existing click-distance failures once it existed to link everything |
| Compare | 13 | The `/compare/` hub plus all 12 spokes, built from live competitor research (see below) rather than assumption |
| Partners | 8 | Hub, 5 vertical spokes, directory (honest empty state — no partnerships exist yet), apply page |
| Driver compare + guides | 8 | Driver-side GoShare/Lugg/Dolly comparison, 4 driver guides, best trucks / ratings & tips / taxes |

**Phase 2 is now fully built: 119/119 pages, 0 QA failures.**

**Compare cluster — researched, not invented.** A background agent researched all 7 app-based competitors and 3 general categories live (dated August 2026) before any page was written, per CLAUDE.md rule #2. Findings that changed how pages were written: **Lugg doesn't serve Fresno/Clovis** (its "Fresno" pages are for Fresno, TX); **Dolly is mid-rebrand to "Taskrabbit Delivery"** with unconfirmed local coverage; **Bungii's consumer app was discontinued in 2024** and it's now B2B-only, so that page says plainly you can no longer book it as an individual rather than forcing a fake head-to-head; **Curri is a construction-supply logistics platform** with no consumer moving use case at all, same honest treatment. **GoShare is the one confirmed local app competitor** (dedicated Fresno and Clovis pages), so it's the only genuine apples-to-apples comparison in the app cluster. Also fixed a pre-existing title-formula bug (`src/lib/meta.ts`) where the `/compare/` hub rendered as "BoxHauls vs. Compare" instead of its own H1 — only surfaced once the hub had real content.

**Driver-side compare, same honesty standard.** None of GoShare, Lugg, or Dolly publish an exact driver payout percentage — the page says so plainly rather than guessing, while BoxHauls's own [[DRIVER_SHARE]]% is stated (appearing only under `/drive/`, per CLAUDE.md's audience-isolation rule). The `/drive/taxes/` page deliberately avoids quoting a specific IRS mileage rate, since that number changes and would go stale — it points to irs.gov and a tax professional instead.

**A script bug surfaced by real content, not introduced by it:** the 4 new driver guides use the `guide` template, not `driver` — `scripts/qa.mjs`'s audience-isolation check keys off `entry.template === "driver"`, so these pages were being evaluated as rider pages for that specific check. Fixed by keeping every in-body `/drive/` link within each page's own declared `links_to` (the check's existing, correct escape hatch) rather than changing the script — the simpler, lower-risk fix.

Each sub-cluster: written, hub pages updated to link every child, `npm run qa` / `npm run links` / `astro check` run clean, visual spot-check in the dev server, committed separately.

## Phase 3 — 9/10 pages shipped, 1 deliberately withheld

7 remaining guide spokes (bed-frame disassembly, Marketplace payment safety, mattress-in-a-box vs. traditional, apartment turnovers, spring cleanout, holiday delivery, college move-out week) plus the driver tax-deductions guide, all following the same patterns and honesty rules as Phase 2.

**`/pricing/pickup-truck-delivery-cost/` — honest empty state, not fabricated data.** Its map spec calls for "anonymized real trip data... distribution chart; medians by item type." BoxHauls hasn't launched, so none of that exists. Rather than invent numbers or leave the route as a bare stub, the page ships with the same formula-based worked examples every other pricing page uses, plus a section stating plainly that real trip data isn't available yet and explaining what will replace it once there's meaningful volume.

**`/cities/{{metro-slug}}/{{neighborhood-slug}}/` (e.g. `/cities/fresno/clovis/`) — deliberately NOT built.** Two independent reasons, either one sufficient alone: (1) CLAUDE.md hard rule #6 says "Only `/cities/fresno/` exists at launch. Do not generate city or neighborhood pages from a template, ever." (2) the map's own content spec marks it "OPTIONAL, phase 3, only with ≥20 completed trips in the neighborhood" — data that can't exist pre-launch. Same category of deliberate non-build as `/es/` from Phase 2, documented here rather than silently skipped. The route still builds (as a stub, like every other un-authored sitemap entry) — only its MDX content was withheld.

## Real booking backend — Phase 1 shipped (real geocoded pricing)

The booking widget's mock hash-based distance (`mockDistanceMiles`) is replaced with real Google Maps geocoding and driving distance. Architecture, decided with the user before building (driver matching: automated marketplace-style; backend platform: Cloudflare Workers + D1; payments: Stripe, already has an account) — this phase covers only the pricing piece; payments and driver matching are separate follow-on phases.

**What shipped:** a new, separate Cloudflare Worker (`api/`, deployed as `boxhauls-api` on `api.boxhauls.com`, its own `wrangler.jsonc`/`package.json`) with a D1 database (`boxhauls`) whose migration (`api/migrations/0001_init.sql`) establishes the *full* future schema now — `customers`, `drivers`, `hauls`, `driver_job_offers`, `promo_redemptions` — even though this phase's only endpoint (`POST /quote`) is stateless, so later phases don't need a fresh migration cycle. `BookingWidget.tsx` now debounces a real fetch to `/quote` instead of the removed `mockDistanceMiles`/`calculatePrice`; submit behavior (the "preview of the booking flow" message) is unchanged — no payment collection or driver matching yet, by design.

Kept as a **separate Worker** rather than an Astro SSR adapter change, to leave `astro.config.mjs`'s static output untouched (matching this repo's stack convention) and avoid Cloudflare routing-precedence ambiguity between the static site's Custom Domain and a path-based `/api/*` route on the same hostname.

**Real problems hit and fixed during the build, in order:**
1. Google blocks the legacy Distance Matrix API on new Cloud projects (`REQUEST_DENIED`, "switch to the Routes API") — migrated `api/src/lib/geocode.ts` to the Routes API (`computeRoutes`) before ever shipping the old one.
2. `wrangler` 3.x couldn't authenticate (`/memberships` call failing) with a properly-scoped API token at all — fixed by upgrading to `wrangler@4`, not by changing token permissions further.
3. Deployed `api.boxhauls.com` inherited **Super Bot Fight Mode** from the shared `boxhauls.com` zone, which challenged the CORS preflight (and the real POST) to `/quote` — `curl` and even real browser `fetch()` calls were blocked. Fixing this crossed a real security boundary: the session's own auto-mode guardrail blocked both a zone-wide bot-management change and a scoped WAF skip-rule attempt as "security weaken" actions, correctly forcing a human decision rather than letting an agent silently loosen production security. The user created the WAF Custom Rule (skip Bot Fight Mode for `hostname eq "api.boxhauls.com"` only) themselves in the dashboard.
4. Applying that rule surfaced a second, previously-hidden bug: a stale wildcard Worker Route (`*.boxhauls.com/*` → the main site's `boxhauls` script, a leftover from early in the DNS-cutover session before Custom Domains were used) had been silently absorbing every request to `api.boxhauls.com` underneath the bot challenge the whole time — once the challenge stopped intercepting first, `api.boxhauls.com` was actually being served by the *static site's* Worker (visible as an Astro trailing-slash `308` redirect on `/health` and `/quote`), not `boxhauls-api`. Deleted the stale route; Custom Domain routing then worked correctly.

Verified end-to-end in production with real Fresno/Clovis addresses: real geocoded distance, real formula-based price, displayed live in the booking widget on `boxhauls.com`.

**Driver-accounts phase (the natural next step — supply side is the real bottleneck to launch) is paused**, not started: BoxHauls, LLC incorporated in California within the last 24 hours and is waiting on its EIN, which Checkr requires for a compliant account. Also decided during scoping: Checkr replaces Veriff as `BACKGROUND_PROVIDER` (Stripe Connect Express's KYC only verifies identity for payout compliance — it does not run criminal or driving-record checks, so a dedicated background-check provider is still required for the vetting `/trust/driver-vetting/` actually describes; Checkr integrates cleanly with Stripe Connect driver flows and is what GoShare, researched earlier, already uses). This swap is live in content now, even though the driver-accounts build itself is on hold.

## `docs/TODO.md` reduction pass (in progress)

While driver-accounts is paused, working through remaining `docs/TODO.md` placeholders in two tracks: business-policy decisions (asked directly, only the user can answer — fees, insurance, cancellation/refund policy, rating threshold, etc., still open) and externally-researchable facts (delegated to a research agent, sourced from official sites only). Resolved so far from the research track:

- Fresno/Clovis municipal: American Avenue Disposal Site and CARTS hours (County of Fresno's own tipping-fee PDF and disposal-sites page); Fresno's One-Time Bulky Item Pickup, Operation Clean Up, and Free Dump Events; Clovis's Community Clean-Up program (fresno.gov, clovisca.gov directly). CARTS fees specifically left as "call to confirm" rather than publishing the only rate sheet found, a stale 2021 PDF on a third-party host — an honest gap beats a confidently-wrong number.
- Fresno State: confirmed Fall 2026 move-in date and move-in-day parking policy; move-out date deliberately kept general since the source was a snippet, not a direct fetch.
- All 9 retailer pickup-lane placeholders, each sourced from that retailer's own help pages — several surfaced real, useful limitations (Costco has no online pickup counter for large items; Walmart ships big/bulky items by carrier delivery, not in-store pickup; Target routes ineligible-for-Drive-Up furniture to Guest Services) worth stating plainly rather than assuming a generic process.

Still open from the business-policy track: insurance carrier/limit, driver liability minimum, stairs/wait-time/cancellation fees, heavy-fee weight threshold, truck tier dimensions, appliance recycling fee, marketplace payment/no-show policy, rating threshold, recheck cadence, cancellation/refund window details, damage-claim windows, hot tub permit responsibility, and `LEGAL_REVIEW_STATUS` (needs an actual attorney). `APARTMENT_CORRIDORS` remains unresolved — outside the scope of the research pass so far.

## Not started

- **Real booking backend — remaining phases**: real payment collection (Stripe Connect), driver accounts and Checkr/Connect onboarding, automated job broadcast-and-accept matching, job lifecycle and payout. Data model already exists in `api/migrations/0001_init.sql`; no code against it yet. Blocked on the LLC's EIN for the Checkr account.
- **`GA4_MEASUREMENT_ID`**: still `TODO` — analytics events fire to the console in dev but nowhere real until this is resolved.
- **Spanish `/es/`** for `/drive/` and core pages — deliberately not scaffolded; `/es/drive/*` isn't in `docs/sitemap.json`, and CLAUDE.md hard rule #1 means routes come from the sitemap via `build_map.py`, not hand-created.
- **The gated neighborhood page** — see above. Will need a `build_map.py`/sitemap decision (real trip-count threshold, real launch data) before it's revisited, not just more writing.
- **Second metro** — not started; no second-metro facts exist in `docs/placeholders.json` to build from.
