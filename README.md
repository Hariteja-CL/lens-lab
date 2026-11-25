# Lens Lab: dark-mode test set (branch `claude/dark-mode-test-set`)

A separate preview for testing how Lens handles dark mode (Hari, 23 Nov 2026). **lab.craftlayers.com (branch `main`) is unchanged** and stays in its fixed state for the video and posts. Never merge this branch into `main`.

This branch holds only the test set: one page per case, each with its own stylesheet and its own token prefix (the code check matches light/dark tokens by name across the whole repository, so pages must not share names). Light mode passes contrast on every page, including AAA (7:1), so the only planted problems are the dark-mode ones below. Contrast numbers are computed when the pages are generated.

| Page | Dark mode switched by | What's wrong (planted) | Expected Lens result today (engine 56c8f88) |
|---|---|---|---|
| `/dark/a-no-dark-mode` | none | No dark mode at all (unbaked). Light only. | Page check `DS-DARK-CONTRAST`: not applicable. Code `DS-THEME-PARITY`: nothing from `a.css` (no dark theme there). No finding. |
| `/dark/b-half-baked` | device setting (`prefers-color-scheme`) | `--b-border` and `--b-focus` have no dark value; `--b-glow` has no light value. Text contrast passes in dark. | Page: `DS-DARK-CONTRAST` pass. With GitHub source: `DS-THEME-PARITY` FAIL, Low, "Colour tokens … missing a light or dark value" (3 tokens, `site/dark/b.css:8`). Website only: no finding (code-level check). |
| `/dark/c-dark-contrast-fails` | device setting | Secondary text `#4a4a4a` fails in dark: 2.11:1 on the `#121212` page and 1.88:1 on the `#1e1e1e` cards (needs 4.5:1). | `DS-DARK-CONTRAST` FAIL, High, "Dark mode has 4 text-contrast failure(s)" on this page, website only and with source. |
| `/dark/d-device-setting` | device setting | Nothing: complete, readable dark theme (the control case). | `DS-DARK-CONTRAST` pass. No finding. |
| `/dark/e1-dark-class` | toggle: `class="dark"` on `<html>` | Same secondary text (2.11:1 on the page, 1.88:1 on the cards), but only after the toggle. | Today Lens cannot turn the theme on: `DS-DARK-CONTRAST` needs review with the toggle note; the 2.11:1 and 1.88:1 failures are **missed**. |
| `/dark/e2-dark-data-theme` | toggle: `data-theme="dark"` on `<html>` | Same as e1, switched by the attribute. | Same as e1: needs review, failure **missed**. |

Notes
- e is split into e1 and e2 so each common toggle is proven on its own.
- Scanning the whole set together: the device-setting pages (b, c, d) run the dark check, so the report's "Dark mode not tested automatically" line is not shown even though e1 and e2 were not tested. Scanning e1/e2 alone shows that line. (Known gap, see the engine item "dark toggles".)
- After the engine item "try common dark toggles" ships: e1 and e2 should become `DS-DARK-CONTRAST` FAIL (High), 4 failures each, with the same evidence (2.11:1 on the page, 1.88:1 on the cards), and a, b, c, d should not change.
- Verified locally on 23 Nov 2026 with the production engine (56c8f88) against these exact files, website only and with source: only the planted results above, no other failing finding.
