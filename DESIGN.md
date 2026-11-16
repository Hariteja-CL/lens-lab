# Fernhollow design system

Fernhollow is a fictional product (Lens Lab, a CraftLayers testing ground). This document deliberately drifts from the code.

## Colour
| Token | Use |
|---|---|
| `--color-bg` | Page background |
| `--color-surface` | Cards and panels |
| `--color-text` | Body text |
| `--color-muted` | Secondary text |
| `--color-brand` | Primary actions and links |
| `--color-brand-old` | Deprecated: do not use in new work |

## Charts
| Token | Use |
|---|---|
| `--color-chart-1` to `--color-chart-5` | Data series, in this order. Each is at least 3:1 against the page background. |
| `--color-chart-grid` | Gridlines only (decorative) |
| `--color-chart-previous` | Comparison series (previous period) |
| `--color-heat-0` to `--color-heat-4` | Heatmap scale, light to dark |

Charts always carry a text alternative: an accessible name that states the main finding, plus a caption or a data table. Series are told apart by text labels, line style or position, never by colour alone.

## Type scale
`--text-sm` 14, `--text-base` 16, `--text-lg` 20, `--text-xl` 24, `--text-2xl` 32. No other sizes.

## Spacing
`--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-6` 24, `--space-8` 32.

## Radius
`--radius-sm` 4, `--radius-md` 8.
