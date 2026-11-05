# M13 — Gutter trace lanes spike

**Conclusion:** Deferred (see **DEC-006**).

VS Code `TextEditorDecorationType` supports gutter icons and `before` text, not multi-lane vertical graphs or per-step arrows across files. A continuous “lane per finding” layout would require webviews or private APIs.

**Shipped instead:** overview ruler marks for trace steps, optional gutter `●` for the active finding (`coverity.traceBadgesEnabled`), and `coverity.experimentalTraceLanes` left **false** with no effect.
