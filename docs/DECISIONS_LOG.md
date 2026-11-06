# Decisions log

Record non-obvious choices here so later edits (human or agent) stay consistent. Format: lightweight ADR.

**How to add an entry:** Copy the template at the bottom, assign the next `DEC-###` id, set status `Accepted` | `Superseded` | `Proposed`.

---

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| DEC-001 | Documentation-first; no code until design/checklist exist | Accepted | 2026-11-04 |
| DEC-002 | Parser lives in single adapter module | Accepted | 2026-11-04 |
| DEC-003 | Primary install target is desktop VS Code folder copy | Accepted | 2026-11-04 |
| DEC-004 | Synthetic report uses cov-format-errors multiline grammar | Accepted | 2026-11-04 |
| DEC-005 | JavaScript-only extension folder (no npm on target) | Accepted | 2026-11-04 |
| DEC-006 | Gutter trace lanes deferred; badges + overview ruler only | Accepted | 2026-11-05 |
| DEC-007 | Extension id `anki.coverity-report-helper`; folder rename deferred | Accepted | 2026-11-05 |
| DEC-008 | No Coverity sidebar; Explorer decorations + Problems + editor | Accepted | 2026-11-05 |
| DEC-009 | Native Peek uses VS Code diagnostics; hover is separate Markdown | Accepted | 2026-11-05 |
| DEC-010 | Milestone scope: skip M-final, compare, M6, M7, M14 | Accepted | 2026-11-05 |
| DEC-011 | Cursor: trace strip in line-decorations column, not glyph margin | Accepted | 2026-11-05 |
| DEC-013 | Full Trace in sidebar WebviewView, not editor WebviewPanel | Accepted | 2026-11-05 |
| DEC-014 | Nested trace step prefixes (`1.1.`) flat list + UI indent | Accepted | 2026-11-05 |
| DEC-015 | Title-only `Type:` + unnumbered `tag: message` events | Accepted | 2026-11-05 |
| DEC-016 | Live edit tracking (shift + rematch) | Accepted | 2026-11-05 |

---

## DEC-016 — Live edit tracking (Tier 1 + 2)

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** On every `onDidChangeTextDocument`, shift tracked ranges via `transformRangeForChange` (including while the buffer is dirty). Overlapping edits mark uncertain and trigger debounced `rematchEventRange` using the tracked line as hint plus `rawPayload`. On save, rematch all events in that file. While a hint line exists, rematch must not fall back to the static report line (stale after inserts) — only column fallback on the hint line. No file-delete/git watcher (Tier 3 out of scope).

---

## DEC-015 — Title-only Type and unnumbered trace lines

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** Parse `Type: Title` without `(checker)` using synthetic checker id from title slug. After a `path:line:col:` line, accept `label: payload` without `N.` prefix and assign auto step numbers `1`, `2`, …

---

## DEC-014 — Nested trace step numbering

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** Parser accepts dotted step prefixes (`1.`, `1.1.`, `2.1.`). Events stay a flat ordered list with `stepPath` / `stepDepth`. Full Trace and hover show hierarchical labels and indent; navigation remains `eventIndex`.

---

## DEC-013 — Full Trace sidebar view

**Status:** Accepted  
**Date:** 2026-11-05

**Context:** Editor-area `WebviewPanel` (Beside) competed with source tabs; step navigation opened in the same split.

**Decision:** Register `coverity.fullTrace` as a **WebviewView** under activity-bar container `coverity` (duck icon). `navigateToStep` opens files in **ViewColumn.One**. User may move the view to the secondary (right) side bar. No findings tree in that container (DEC-008 scope unchanged for bulk navigation).

---

## DEC-011 — Trace margin vs glyph gutter in Cursor

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** `gutterIconPath` (breakpoint / glyph margin) is not honored for this extension in Cursor; editor background decorations work. Draw the trace timeline in the **line-decorations** column using one fixed-width `before.contentIconPath` SVG per line: empty lane grid on every line in the file; step nodes and spines only on active-finding trace lines. Widen `editor.lineDecorationsWidth` (default contribution 72px).

---

## DEC-010 — Agreed milestone exclusions

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** Do not implement **M-final**, **M-optional-compare**, **M6**, **M7**, or **M14**. Keep **DEC-008** Explorer/Problems/editor surfaces. Implement remaining milestones (M2–M5, M8–M13, M15, M-optional-rerun) fully.

---

## DEC-009 — Peek vs hover for Coverity trace

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** Inline **Peek** shows standard `Diagnostic` messages from `Coverity Report`; rich SVG timeline and step links live in **editor hover** only. Peek is not customized to render the timeline.

---

## DEC-008 — Remove dedicated Coverity tree panel

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** Drop activity bar container and Findings tree view. Use FileDecorationProvider on Explorer, DiagnosticCollection in Problems, and editor hover/CodeLens/navigation commands.

---

## DEC-007 — Publisher and extension name

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** `package.json` uses `"publisher": "anki"` and `"name": "coverity-report-helper"`. Installable files live in `anki.coverity-report-helper-0.1.0/`; symlink/copy that folder to `~/.cursor/extensions/anki.coverity-report-helper-0.1.0`. Git repo root stays `coverity-vscode-extension`.

---

## DEC-005 — JavaScript-only extension

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** Ship plain `.js` under `src/` with `extension.js` entry; no bundle/npm install on destination.

---

## DEC-006 — Gutter lanes deferred

**Status:** Accepted  
**Date:** 2026-11-05

**Decision:** `coverity.experimentalTraceLanes` default false; no multi-lane arrow graph (Decoration API insufficient). Active-finding step hints via gutter `before` text when `traceBadgesEnabled`.

---

## DEC-004 — cov-format-errors multiline as primary report shape

**Status:** Accepted  
**Date:** 2026-11-04

**Context:** User’s real error file matches `cov-format-errors` multiline (MISRA `Type:` lines, per-event locations). Interstellar fixture was trace-only.

**Decision:** Rewrite `my-repo/deploy/coverity/coverity-report.txt` with occurrence headers, `Type: … (CHECKER)`, optional Classification/Severity, and indented numbered events. Document in `PARSER_FORMAT.md`. Parser implementation should target this first.

**Consequences:** Error type grouping uses `Type:` checker (e.g. `FORWARD_NULL`, MISRA rule ids); event tags remain step labels only.

---

## DEC-001 — Documentation-first milestone

**Status:** Accepted  
**Date:** 2026-11-04

**Context:** Greenfield repo; large requirements doc in `CURSOR_COVERITY_EXTENSION_PROMPT.md`.

**Decision:** Create `docs/` design, checklist, parser guide, acceptance, and tracking files before application code.

**Consequences:** Implementation checklist M0 partially complete; M1+ remain open.

---

## DEC-002 — Single parser adapter module

**Status:** Accepted  
**Date:** 2026-11-04  
**Source:** User clarification in prompt § “adaptable report grammar”

**Decision:** All line/boundary rules live in one module (e.g. `src/parser/textReportParser.ts`). UI, tracking, and persistence must not embed format regexes.

**Consequences:** `PARSER_FORMAT.md` points editors to one file; fixtures required for each grammar change.

---

## DEC-003 — Install target VS Code (not Cursor-only)

**Status:** Accepted  
**Date:** 2026-11-04

**Decision:** Build and verify staged folder for standard desktop VS Code user extensions dir; document Cursor path differences without assuming they match.

**Consequences:** README must mention untested hosts; Extension Development Host validation on VS Code.

---

## Template

```markdown
## DEC-NNN — Short title

**Status:** Proposed | Accepted | Superseded by DEC-NNN  
**Date:** YYYY-MM-DD

**Context:** …

**Decision:** …

**Alternatives considered:** …

**Consequences:** …
```
