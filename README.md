# Lens Lab

A testing ground for CraftLayers Lens. It hosts **Fernhollow**, an invented café-shift planner with deliberate design, accessibility and frontend flaws.

- Fernhollow is fictional. It is not a real product or company, and any resemblance is unintended.
- Branches: `before` (all seeded issues), `after` (about half fixed), `main` (what is deployed and scanned).
- `v2` is Lens Lab v2: 23 pages (marketing site plus an `/app/` area with charts). Regenerate the pages with `node tools/gen-v2.mjs` and check them with `node tools/check-v2.mjs`. The seeded issues are mapped in `ISSUES.md`.
- The site is in `site/` and is served as static files. Pages are `noindex`.
- Do not copy these patterns into real work: many of them are wrong on purpose.
