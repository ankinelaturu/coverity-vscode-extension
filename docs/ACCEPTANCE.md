# Acceptance and manual test checklist

Derived from [CURSOR_COVERITY_EXTENSION_PROMPT.md](./CURSOR_COVERITY_EXTENSION_PROMPT.md) § Validation and acceptance. Use alongside automated parser/range tests.

**Record results in** [NOTES.md](./NOTES.md) (Test sessions table) when executing.

**Environment fields to record:** OS, VS Code version, extension path (staged folder), workspace layout, report fixture name.

---

## A. Installation and activation

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| A1 | Copy staged folder to user extensions dir (not project `.vscode`) | | |
| A2 | Reload/restart; extension activates without npm install on target | | |
| A3 | Compiled `main` exists; icons/lookup assets resolve | | |
| A4 | No network required to view loaded report | | |

---

## B. Load and parse

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| B1 | Open C/C++ folder workspace; no build setup required | | |
| B2 | Load Report via picker; counts and parse warnings visible | | |
| B3 | Reload Report explicit; Refresh layout does not reload file | | |
| B4 | Unmatched/unknown lines accessible; original report file unchanged | | |
| B5 | Synthetic fixtures: numbered, unnumbered, cross-file, colons in payload | | (automated + spot check) |

---

## C. Sidebar layouts and counts

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| C1 | **Files** default: flat files, findings, steps | | |
| C2 | Single-step finding navigates without redundant child | | |
| C3 | **Folders** adds only relevant folder ancestors | | |
| C4 | **Error type** groups by checker; Unknown type when missing | | |
| C5 | Finding touching files A/B/C listed once per file but **one** global count | | |
| C6 | Tooltip explains cross-file count math | | |
| C7 | Switch layout; selection preserved on same finding/step | | |
| C8 | Active file only shows findings with any step in active file; full trace on expand | | |
| C9 | Search/filter matches type, label, message, path | | |
| C10 | Severity filter only when metadata exists; Unknown shown | | |

---

## D. Navigation and editor markers

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| D1 | Click each step including cross-file; lands on tracked location | | |
| D2 | Unresolved path → mapping action; **no** wrong-file open | | |
| D3 | Open source file directly; markers/diagnostics appear without sidebar click | | |
| D4 | Known snippet highlights expected range | | |
| D5 | Ambiguous/ no match → uncertain or fallback flagged | | |
| D6 | Overview ruler visible for orientation | | |
| D7 | Diagnostics distinguish Coverity from compiler/LSP source | | |
| D8 | Supporting steps not all shown as independent Errors (per policy) | | |

---

## E. Hover and trace commands

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| E1 | Hover: label, payload, step N of M, optional lookup text | | |
| E2 | Step links navigate; report text escaped (no injected commands) | | |
| E3 | Previous/Next follow trace order, not line order; no wrap | | |
| E4 | Multiple findings at line require choice before ambiguous prev/next | | |
| E5 | Native Peek inspected; limitations documented (no custom HTML promise) | | |

---

## F. CodeLens and decorations (if enabled)

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| F1 | CodeLens off by setting (or default documented) | | |
| F2 | Concise text; unknown checker neutral wording | | |
| F3 | Multiple findings on line aggregated with chooser | | |
| F4 | Gutter badges only for active finding steps (if enabled) | | |
| F5 | Experimental lanes off by default; no unsupported promises | | |

---

## G. Edit tracking and persistence

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| G1 | Insert/delete **before** range shifts location in tree/diag/hover/lens | | |
| G2 | Edit overlapping range → uncertain, not auto-cleared | | |
| G3 | Undo/redo restores confidence when content matches baseline | | |
| G4 | Restart: cache restores when report + content hashes match | | |
| G5 | Changed file on disk or new report → stale path + reset offer | | |
| G6 | Unsaved buffer: positions not saved against wrong hash | | |
| G7 | Reset adjusted locations clears tracking; report untouched | | |

---

## H. Path mapping

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| H1 | Windows absolute paths resolve when file exists | | |
| H2 | Relative paths with mapping | | |
| H3 | Duplicate basename does not pick unrelated file | | |
| H4 | External SDK path shown unresolved, not dropped | | |

---

## I. Optional — Rerun Coverity

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| I1 | Unconfigured → config flow; not prompted every run when configured | | |
| I2 | Workspace Trust required before run | | |
| I3 | Success loads **new** report; old adjusted ranges not blindly kept | | |
| I4 | Failure/cancel keeps previous report | | |
| I5 | Duplicate concurrent run prevented | | |
| I6 | Unsaved files warned per setting | | |
| I7 | Harmless wrapper tested; real Docker marked untested if applicable | | |

---

## J. Optional — Compare runs

| # | Scenario | Pass | Notes |
|---|----------|------|-------|
| J1 | Requires two valid snapshots; default off | | |
| J2 | New / Still / No longer / Uncertain groups | | |
| J3 | “No longer reported” not labeled “Fixed” without comparability | | |
| J4 | Historical locations not published as current errors | | |

---

## Automated test matrix (unit)

| Area | Cases | Linked checklist |
|------|-------|------------------|
| Parser | unnumbered, single numbered, cross-file, missing checker, Windows/relative paths, colons in payload, malformed, duplicate blocks | M2 |
| Range tracker | insert before/inside/after, same-line columns, multiline replace, multi-edit, undo, Unicode, delete | M10 |
| Persistence | match/mismatch restart, corrupt cache, unsaved buffer | M11 |
| Compare (optional) | shifted lines, duplicates, scope change, stable ID, heuristic ambiguous | M-optional-compare |

---

## Sign-off block (fill when releasing staged folder)

| Field | Value |
|-------|-------|
| Date | |
| Version | |
| Commit / tag | |
| Core scenarios passed (A–H) | / |
| Optional (I–J) | N/A or / |
| Known limitations | |
| Verified parser against user sample | Yes / No (OQ-001…) |
