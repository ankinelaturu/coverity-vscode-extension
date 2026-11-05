# Implementation checklist

Track progress here. Link decisions to [DECISIONS_LOG.md](./DECISIONS_LOG.md) and blockers to [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md). Acceptance scenarios: [ACCEPTANCE.md](./ACCEPTANCE.md).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[—]` deferred optional · `[?]` blocked

---

## M0 — Repository and documentation

- [x] Requirements captured in `CURSOR_COVERITY_EXTENSION_PROMPT.md`
- [x] Design doc, checklist, parser guide, acceptance, notes infrastructure
- [x] Root `README.md` (project overview + pointer to docs)
- [ ] Choose extension id, display name, publisher prefix for folder name (record in DECISIONS_LOG)

---

## M1 — Scaffold, build, staging (no feature-complete UI yet)

- [ ] TypeScript extension scaffold (`package.json`, `tsconfig`, entry activation)
- [ ] ESLint/format baseline (if desired)
- [ ] Bundle config: external `vscode`, bundle runtime dependencies
- [ ] `npm run build` produces compiled output
- [ ] `npm run stage` (or equivalent) writes `dist-extension/local.coverity-report-helper-0.1.0/` (name TBD)
- [ ] Icons and `package.json` contributes: view, commands (stubs OK initially)
- [ ] README: install copy path (Windows/macOS/Linux), Cursor vs VS Code, reload steps
- [ ] Verify staged folder has `main` JS and assets without requiring `npm install` on target
- [ ] Document untested install hosts honestly

---

## M2 — Parser adapter and fixtures

- [ ] `src/parser/textReportParser.ts` (or agreed path) — all format rules in one module
- [ ] Constants/patterns at top with comments + examples ([PARSER_FORMAT.md](./PARSER_FORMAT.md))
- [ ] Synthetic fixtures: unnumbered single event; single numbered; cross-file trace; colon in payload
- [ ] Expected normalized JSON (or snapshot) per fixture
- [ ] Parse warnings + unmatched lines with **source line numbers**
- [ ] Preserve raw blocks; optional summary line; provisional blank-line boundaries
- [ ] Dev command/script: print structured parse output for a file (no upload/exec)
- [ ] Unit tests + single command to run parser tests only
- [ ] `PARSER_FORMAT.md` updated with edit instructions
- [ ] **Verification gate:** `[ ]` Real sanitized user report parsed and fixtures adjusted (blocked until sample)

---

## M3 — Canonical model and indexes

- [ ] Schema version on report model
- [ ] Report fingerprint / hash
- [ ] Stable finding IDs (CID or deterministic local)
- [ ] TraceEvent order, raw label/payload separation
- [ ] File URI index (events → finding)
- [ ] Checker index for Error type view
- [ ] One finding ↔ many files indexing rules (no duplicate finding rows per file)
- [ ] Unit tests for ID stability and duplicate blocks

---

## M4 — Load report command and parse status

- [ ] Load Report (file picker); remember path in workspace/memento
- [ ] Reload Report (explicit)
- [ ] Status bar or tree message: finding count, warning count
- [ ] UI to inspect parse warnings / unmatched blocks (output channel or tree node)
- [ ] Original report file never modified by extension

---

## M5 — Path resolution

- [ ] Normalize paths (Windows drive, slashes, spaces, relative)
- [ ] Multi-root workspace support
- [ ] Configuration: report path prefix → workspace folder mappings
- [ ] Unresolved locations visible; **Configure path mapping** command
- [ ] Tests: Windows path, relative path, duplicate basename (must not pick wrong file)
- [ ] Document: no execution of paths from report

---

## M6 — Findings tree — Files layout (default)

- [ ] Tree view `Coverity Findings` registered
- [ ] Files layout: file → finding → steps (collapse single-step redundancy)
- [ ] Finding row: title/checker when known, path context, step count
- [ ] Click step/finding → navigation command (stub → full in M8)
- [ ] Collapse All command

---

## M7 — Layouts, filters, selection

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

- [ ] Shared active finding/step state
- [ ] Open document + reveal range + selection
- [ ] Snippet matcher with uncertainty and column disambiguation
- [ ] Coordinate mapping module (document assumptions)
- [ ] DiagnosticCollection per workspace; source `Coverity Report`
- [ ] Display policy for main vs supporting steps documented in README/decisions
- [ ] Overview ruler decorations
- [ ] Auto-show markers when opening source file
- [ ] Cross-file step navigation

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
