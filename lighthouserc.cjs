// Lighthouse CI config (kickoff Prompt 3 item 5). Not wired into an npm
// script yet — running it needs Chrome, which this environment doesn't
// have; wire `"lighthouse": "lhci autorun"` (after `npm i -D @lhci/cli`)
// once a CI runner or local Chrome is available. Budgets are mobile,
// per CLAUDE.md's technical spec (topical-map.md §12).
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      // A representative page per template — not all 194, to keep runs fast.
      url: [
        "http://localhost/index.html",
        "http://localhost/pricing/index.html",
        "http://localhost/pricing/cost-to-move-a-couch/index.html",
        "http://localhost/services/furniture-delivery/index.html",
        "http://localhost/services/furniture-delivery/couch-delivery/index.html",
        "http://localhost/cities/fresno/index.html",
        "http://localhost/compare/boxhauls-vs-lugg/index.html",
        "http://localhost/guides/will-it-fit-in-a-pickup-bed/index.html",
        "http://localhost/drive/index.html",
        "http://localhost/partners/index.html",
        "http://localhost/legal/terms/index.html",
      ],
      settings: {
        preset: "mobile",
      },
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        // Budgets per CLAUDE.md: LCP < 2.5s, INP < 200ms, CLS < 0.1.
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "interactive": ["warn", { maxNumericValue: 3800 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        // INP itself isn't a Lighthouse lab metric (it's field data); TBT is
        // the closest lab proxy Lighthouse can assert on directly.
        "total-blocking-time": ["warn", { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
