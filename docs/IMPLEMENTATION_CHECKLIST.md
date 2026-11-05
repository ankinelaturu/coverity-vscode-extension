# Implementation checklist

Track progress here. Link decisions to [DECISIONS_LOG.md](./DECISIONS_LOG.md) and blockers to [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md). Acceptance scenarios: [ACCEPTANCE.md](./ACCEPTANCE.md).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[—]` deferred optional · `[?]` blocked

---

## M0 — Repository and documentation

- [x] Requirements captured in `CURSOR_COVERITY_EXTENSION_PROMPT.md`
- [x] Design doc, checklist, parser guide, acceptance, notes infrastructure
- [x] Root `README.md` (project overview + pointer to docs)
- [x] Extension id `anki.coverity-report-helper` in `anki.coverity-report-helper-0.1.0/` — DEC-007

---

## M1 — Scaffold, build, staging (no feature-complete UI yet)

- [x] JavaScript extension scaffold (`package.json`, `extension.js` activation)
- [—] ESLint/format baseline (skipped — plain JS)
- [—] npm bundle/stage (skipped — copy folder; see DEC-005)
- [x] Icons and `package.json` contributes: view, commands
- [x] README: install copy path, Cursor reload
- [x] No npm install on target (plain JS + `vscode` built-in)
- [x] Cursor in-place extension folder documented; VS Code copy path in README

---

## M2 — Parser adapter and fixtures

- [x] `src/parser/textReportParser.js` — all format rules in one module
- [x] Constants/patterns at top with comments + examples ([PARSER_FORMAT.md](./PARSER_FORMAT.md))
- [x] Synthetic fixture: `my-repo/deploy/coverity/coverity-report.txt` (multiline Type + trace)
- [—] JSON snapshot unit tests (minimal testing per user request)
- [x] Parse warnings + line numbers
- [x] Summary line; blank-line rule after metadata before trace
- [x] `node scripts/inspect-report.js <file>`
- [—] npm unit test runner (skipped)
- [x] `PARSER_FORMAT.md` updated
- [x] **Verification gate:** user confirms format match; synthetic aligned to cov-format-errors

---

## M3 — Canonical model and indexes

- [x] Schema version on report model
- [x] Report fingerprint / hash
- [x] Stable finding IDs (CID or deterministic local)
- [x] TraceEvent order, raw label/payload separation
- [x] File URI index (events → finding)
- [x] Checker index for Error type view
- [x] One finding ↔ many files indexing rules (no duplicate finding rows per file)
- [—] Unit tests for ID stability and duplicate blocks

---

## M4 — Load report command and parse status

- [x] Load Report (file picker); remember path in workspace/memento
- [x] Reload Report (explicit)
- [x] Status bar or tree message: finding count, warning count
- [x] UI to inspect parse warnings / unmatched blocks (output channel or tree node)
- [x] Original report file never modified by extension

---

## M5 — Path resolution

- [x] Normalize paths (Windows drive, slashes, spaces, relative)
- [x] Multi-root workspace support
- [x] Configuration: report path prefix → workspace folder mappings
- [x] Unresolved locations visible; **Configure path mapping** command
- [—] Tests: Windows path, relative path, duplicate basename (must not pick wrong file)
- [x] Document: no execution of paths from report

---

## M6 — Findings tree — Files layout (default)

- [—] **Out of scope (DEC-008):** Explorer + Problems + editor instead of sidebar tree
- [ ] Tree view `Coverity Findings` registered
- [ ] Files layout: file → finding → steps (collapse single-step redundancy)
- [ ] Finding row: title/checker when known, path context, step count
- [ ] Click step/finding → navigation command (stub → full in M8)
- [ ] Collapse All command

---

## M7 — Layouts, filters, selection

- [—] **Out of scope (DEC-008)** with M6
- [ ] View by: Files / Folders / Error type (mutually exclusive)
- [ ] Folders layout: only folders on report paths
- [ ] Error type: checker groups, unknown bucket, unique counts in labels/tooltips
- [ ] Active file only filter (full trace preserved)
- [ ] Search/filter command (type, label, message, path)
- [ ] Selection stable across layout switch (finding/step identity)
- [ ] Refresh layout does not reload report or reset adjusted ranges
- [ ] Severity filter only if metadata exists

---

## M8 — Navigation, range matching, diagnostics

- [x] Shared active finding/step state
- [x] Open document + reveal range + selection
- [x] Snippet matcher with uncertainty and column disambiguation
- [x] Coordinate mapping module (document assumptions)
- [x] DiagnosticCollection per workspace; source `Coverity Report`
- [x] Display policy for main vs supporting steps documented in README/decisions
- [x] Overview ruler decorations
- [x] Auto-show markers when opening source file
- [x] Cross-file step navigation

---

## M9 — Hover and trace commands

- [ ] HoverProvider with escaped content
- [ ] Step N of M, trace list, current emphasis
- [ ] Trusted command links for step jumps
- [ ] Previous / Next trace step commands (+ optional keybindings)
- [ ] Multiple findings at location: disambiguation before prev/next
- [ ] Fallback markdown list if timeline styling unavailable
- [ ] Verify native Peek behavior with related diagnostics (note in DECISIONS_LOG)

---

## M10 — Edit tracking

- [ ] Range transform on `onDidChangeTextDocument`
- [ ] Multi-edit, undo/redo, multiline, same-line columns
- [ ] Overlap → uncertain status in model
- [ ] Debounced refresh of tree/diagnostics/hover/lens
- [ ] Unit tests for transform cases (see ACCEPTANCE matrix)

---

## M11 — Persistence

- [ ] Workspace storage schema version
- [ ] Save/load adjusted ranges + content hashes + report hash
- [ ] Invalidate on report change, content mismatch, corrupt cache
- [ ] Dirty buffer handling
- [ ] Reset adjusted locations command
- [ ] File rename handling (best-effort)
- [ ] Tests: match/mismatch restart, unsaved buffer

---

## M12 — CodeLens and decorations (optional but in scope)

- [ ] Setting: CodeLens on/off (default TBD)
- [ ] Lens text uses only known metadata
- [ ] Aggregate multiple findings on one line
- [ ] Setting: trace gutter badges for active finding only
- [ ] Setting: experimental lanes off by default

---

## M13 — Gutter lane feasibility

- [ ] Spike/prototype: decoration limits documented
- [ ] Either bounded useful implementation OR explicit deferral entry in DECISIONS_LOG + user-facing “experimental off”
- [ ] No private API / DOM manipulation

---

## M14 — Trace Details webview (optional)

- [ ] `[—]` Optional panel/sidebar for rich timeline
- [ ] Shares navigation commands with hover/tree
- [ ] Not required for MVP sign-off if core hover/sidebar complete

---

## M15 — Descriptions lookup

- [ ] Bundled lookup file(s), version field
- [ ] Checker + event tag entries for labels seen in fixtures
- [ ] Unknown labels fall back to raw
- [ ] README note on offline use and doc links

---

## M-optional-rerun — Rerun Coverity (WSL/Docker)

- [ ] `[—]` Workspace setting schema (distro, linux cwd, command/script, report output path)
- [ ] `[—]` Workspace Trust gate + first-run configuration flow
- [ ] `[—]` Toolbar: Rerun Coverity
- [ ] `[—]` Task/terminal execution, status, duplicate-run prevention
- [ ] `[—]` Save-before-run setting + unsaved warning
- [ ] `[—]` Success: verify new report, atomic load, refresh all surfaces, new tracking baseline
- [ ] `[—]` Failure/cancel: retain previous report
- [ ] `[—]` Path mapping docs: Windows ↔ WSL ↔ container vs report-location mapping
- [ ] `[—]` Harmless wrapper fixture for tests; real Docker marked untested until user config supplied

**Blocked on:** [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) — user command template

---

## M-optional-compare — Compare runs

- [ ] `[—]` Retain previous successful snapshot before replace
- [ ] `[—]` Compare Runs command; default off
- [ ] `[—]` Groups: New, Still, No longer, Uncertain
- [ ] `[—]` Stable Coverity IDs when present; heuristics documented
- [ ] `[—]` Historical findings not published as current errors
- [ ] `[—]` Tests for shift/duplicate/scope change cases

---

## M-final — Validation and release folder

- [ ] All core `[ ]` items through M11 (minimum) complete
- [ ] Parser + range unit tests green in CI or local script
- [ ] [ACCEPTANCE.md](./ACCEPTANCE.md) manual pass recorded in NOTES or DECISIONS_LOG
- [ ] Known limitations section in README
- [ ] Staged extension folder smoke-tested in VS Code Extension Development Host
- [ ] List implemented vs deferred features explicitly

---

## Quick reference: suggested implementation sequence (from prompt)

1. M1 → M2 → M3 → M4  
2. M5 → M6 → M7  
3. M8 → M9  
4. M10 → M11  
5. M12 → M13 → (M14) → M15  
6. Optional milestones when unblocked  
7. M-final  
