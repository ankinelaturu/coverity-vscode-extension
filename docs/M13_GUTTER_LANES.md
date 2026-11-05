# M13 — Gutter trace lanes

**Status:** Bounded implementation via public API (2026-11-05).

## Approach

- **Fixed width:** `traceGutterLaneCount × traceGutterLaneWidth` (default 8×8 = **64px**). Every gutter row SVG uses the full width so the editor gutter does not resize per selection.
- **Multi-lane:** In-file steps of the **active finding** get lane assignments (trace order). Vertical spine segments and horizontal connectors render on step rows and on lines strictly between consecutive in-file steps.
- **Mechanism:** Per-line `gutterIconPath` SVG files cached under extension `globalStorage` (VS Code requires file URIs).
- **Scope:** Active finding only; cross-file trace continues in other files (no fake arrows across editors).

## Limitations (unchanged from prompt)

- Not a single continuous canvas across lines — each line is its own icon; spines on intermediate lines connect consecutive steps in the **same file**.
- Gutter icons are not separately clickable; use hover, CodeLens, or keyboard step navigation.
- No DOM hacks or private VS Code APIs.

## Settings

| Setting | Default |
|---------|---------|
| `coverity.experimentalTraceLanes` | `false` |
| `coverity.traceGutterLaneCount` | `8` |
| `coverity.traceGutterLaneWidth` | `8` |

When lanes are on, inline `before` step numbers (`traceBadgesEnabled`) are suppressed to avoid duplicate clutter.
