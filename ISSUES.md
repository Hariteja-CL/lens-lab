# Lens Lab issue map (hidden: not linked from the site, not deployed)

Fernhollow is fictional. Each seeded issue has an ID. "After" says whether the `after` branch fixes it.
Token names below are written without their leading dashes on purpose, so this file is not read as design-system documentation.

| ID | Page / file | Seeded issue | Lens check | Expected | After |
|---|---|---|---|---|---|
| S-01 | / | "Start free trial" link, #8a94a3 on white (about 3:1) | colour contrast (1.4.3) | detected | fixed |
| S-02 | / | Near-invisible "Book a demo" button, #eef0f3 on white (about 1.1:1) | colour contrast; worst-contrast crop | detected | open |
| S-03 | /pricing | Visible "Choose Team", aria-label "Select plan" | label-content-name-mismatch (2.5.3) | detected | fixed |
| S-04 | /pricing | Team plan card is a role="button" control with a "Compare" link inside | nested-interactive | detected | open |
| S-05 | /pricing | 720 px comparison table without a scroll wrapper | phone pass (390 px): page scrolls sideways | detected | fixed |
| S-06 | /blog/rota-tips | h1 followed by h3 | heading-order | detected | fixed |
| S-07 | /app/dashboard | Empty header cell above the row-action column | empty-table-header | detected | open |
| S-08 | /signup | Team size: no label and no placeholder. Number of tills: placeholder only | label (axe); placeholder-only is not flagged by axe | team size detected; tills: KNOWN GAP | fixed |
| S-09 | /signup | Name and phone autocomplete="off"; email has none | Lens autocomplete probe (1.3.5) | detected | open |
| S-10 | /blog/rota-tips | Broken image (latte-art.svg missing) | page-load checks: console error + failed request (no dedicated broken-image check yet) | detected (indirectly) | fixed |
| S-11 | site/styles/components.css | Hard-coded hex colours instead of tokens | DS-TOKEN-HARDCODE | detected (Pages + GitHub) | open |
| S-12 | DESIGN.md | Documents color-accent-warm and space-7, which tokens.css does not define | DS-DOC-DRIFT | detected (Pages + GitHub) | fixed |
| S-13 | tokens.css / components.css | color-brand-old is marked deprecated but still used | DS-DOC-DRIFT | detected (Pages + GitHub) | open |
| S-14 | components.css | Off-scale font sizes 13, 15, 22 px | DS-TYPE-RAMP | detected | fixed |
| S-15 | components.css | Off-scale spacing 7 and 13 px | DS-SPACE-RAMP | detected | open |
| S-16 | /app/settings | Icon-only button with no accessible name | button-name (4.1.2) | detected | fixed |
| S-17 | /app/dashboard | SVG chart with role="img" and no name | svg-img-alt (1.1.1) | detected | open |
| S-18 | /about, /blog, /changelog, /privacy | none (clean pages) | all checks | no findings on these pages | n/a |
| S-19 | / | Image with no alt attribute (cafe-counter.svg) | image-alt (1.1.1) | detected | fixed |
| S-20 | /app/settings | Icon link with no accessible name | link-name (2.4.4, 4.1.2) | detected | open |
| S-21 | /app/dashboard | html element without lang | html-has-lang (3.1.1) | detected | fixed |

After branch: fixed S-01, S-03, S-05, S-06, S-08, S-10, S-12, S-14, S-16, S-19, S-21 (11); open S-02, S-04, S-07, S-09, S-11, S-13, S-15, S-17, S-20 (9).
