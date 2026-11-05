# Cursor agent handoff: Coverity report navigation helper

## Your assignment
Build a local, desktop VS Code extension in TypeScript from this design brief. This document records a brainstorming session, including firm requirements, proposed defaults, and experiments. Use judgment for routine implementation choices, but do not silently turn uncertain report assumptions or unsupported editor features into facts. Start by inspecting the repository and any supplied sanitized report samples, then implement the usable core. Do not stop at a plan if implementation is possible.

The user opens an embedded C/C++ source project as an ordinary folder in VS Code, loads an existing static Coverity text report, and uses the extension to inspect and fix findings. Builds, execution, hardware debugging, and subsequent Coverity runs happen elsewhere, principally Keil µVision. No Keil project conversion, compiler configuration, language server, Coverity service connection, or Coverity license should be necessary merely to view a supplied report.

The extension parses report text, not C/C++ semantics. It does not prove that edits resolve findings. No AI service, source upload, or network lookup is needed at runtime. Optional descriptions are a local verified lookup.

## Deliverable and installation: folder, not VSIX
Provide source plus a ready-to-copy extension folder containing package.json at its root, compiled/bundled JavaScript matching its main entry, icons, lookup data, and all runtime dependencies. Do not require a VSIX or Marketplace publication. A source-only TypeScript folder is insufficient.

Supply a build command and a staging command producing e.g. dist-extension/local.coverity-report-helper-0.1.0/. Prefer bundling runtime dependencies so npm install is unnecessary on the destination machine. Exclude the vscode module from the bundle; VS Code supplies it. Include README installation and update instructions.

For standard desktop VS Code on Windows, copy the staged folder into %USERPROFILE%\.vscode\extensions\ and restart VS Code/reload as required. macOS/Linux normally use ~/.vscode/extensions/. These are USER extension directories, not the project's .vscode directory. Profiles, portable installations, --extensions-dir, remote hosts, and Cursor may use different locations: document that distinction and verify the intended host. Cursor is the development agent/editor; the initial deployment target is desktop VS Code. Never overwrite another installed extension automatically. Verify manual folder discovery in a real Extension Development Host/local host where available; report untested installation steps honestly.

## Terminology and data integrity
- Finding: one reported issue, potentially with many trace events.
- Trace/event/step: one location plus event label and text, in the finding's ordered path.
- Checker ID (e.g. FORWARD_NULL): overall issue type, suitable for error-type grouping when actually present.
- Event tag (e.g. assignment or var_deref_op): kind of trace step, NOT a unique finding ID and NOT automatically an error type.
- Number 1, 2, 3: trace order, not severity. A lone 1 is valid.
- Unnumbered diagnostic: preserve it; absence of a number alone does not establish its provenance/type.
- Never assume the highest-numbered or last event is the main defect. Never infer severity from step count, order, or a generic event tag.
- Preserve each original block and original locations unchanged. Maintain current display locations separately.

## Report format: observed but NOT yet verified against a complete sample
The user recalls an optional first-line summary, a blank line, and blocks of alternating location/event lines. Blank lines appear to separate findings. Events inside one block may span several files. Some event lines have a numeric prefix, some only a label. After a label and colon, the user reports seeing source text; exact syntax, wrapping, whether it is a full line or partial snippet, and any additional explanatory messages are not verified.

Illustrative only; this is NOT a certified native Coverity export grammar:

```text
<optional summary: preserve; do not require a particular count>

C:\repo\src\reader.c:40:5
1. returned_null: Reader *reader = get_reader();
C:\repo\lib\reader_helpers.c:75:9
2. assignment: active_reader = reader;
C:\repo\src\card.c:120:5
3. var_deref_op: active_reader->status = READY;

C:\repo\src\other.c:22:3
<label>: <source snippet or diagnostic text>
```

Before claiming compatibility, inspect a real sanitized sample. Until supplied, implement the provisional grammar behind a parser adapter and label the sample fixtures synthetic. Keep useful core development moving; document which assumptions need verification.

Parser requirements:
- Tolerate CRLF/LF, BOM, indentation, numbered and unnumbered events, a single numbered event, multiple events per finding, multiple findings in one file, and cross-file traces.
- Parse path + trailing numeric line/column fields; do not split Windows drive letters or message bodies at every colon. Support relative paths and paths with spaces.
- Split event label from payload at its structural separator only, preserving all remaining punctuation/source text.
- Treat blank lines as provisional block boundaries, not a universal Coverity guarantee. Wrapped/multiline snippets may contain blank lines. Preserve unknown records and produce parse warnings instead of silently discarding or inventing findings.
- Store raw payload separately from any verified source snippet and explanation. Do not declare prose to be source code merely because it follows a colon.
- Preserve explicit checker ID, impact/severity, CID, main-event flag, and ranges if the actual report includes them. Missing values remain unknown.
- Ignore summary wording for navigation; do not equate its count to findings without evidence.
- Do not reconstruct C statements or infer call graphs.
- Show parse status and unmatched blocks with access to original text.

## Canonical model and indexing
Separate immutable Report/Finding/TraceEvent data from mutable LocationTracking and view models. Include schema version, report fingerprint, raw block reference, stable report-local finding ID, original event order/index, raw label/payload, optional checker and metadata, resolved URI, original position, current range, and tracking status. Use a real report ID when available; otherwise generate deterministic report-local IDs without pretending they are Coverity CIDs. Account for identical blocks without collisions.

Index events by normalized source URI; each event still points to its parent finding. One finding can touch files A, B, C. Show references under each involved file in file-oriented views, but keep ONE canonical finding and ONE overall count. Expanding any reference exposes the full trace, including other files. Avoid repeatedly listing the same finding under the same file merely because several events use that file.

## Findings sidebar
Contribute a native Tree View named Coverity Findings. Reuse file/finding/step presentation and command behavior across layouts; layout changes supply different parents and filters.

### Layout selector: View by
1. Files (DEFAULT): flat list of file entries; no folder ancestors. Each file contains its findings. Expand multistep findings to see ordered steps. A single-step finding navigates directly without a redundant one-child layer.
2. Folders: exactly the same file entries, findings, and steps, with workspace/source folder ancestors added. Show folders containing report locations; do not clone the entire unrelated project tree.
3. Error type: checker/type group -> matching files -> matching findings -> full steps. Group heading has a friendly type name, original checker ID, and unique finding count. File entries show only findings matching that group. Unknown checker goes under Unknown type. Do not classify by arbitrary event labels.

Example concept: Possible NULL dereference (FORWARD_NULL) — 24 findings. Overall summary: 8 known types, 120 unique findings, with unknown count separately if applicable. Counts are unique within each scope; sums of per-file counts can exceed the overall count for cross-file findings. Make that clear in tooltips.

Keep selection stable by model identity while switching layouts; manage separate view-occurrence IDs for repeated references. Keep expansion state where practical. A finding row uses readable verified title/checker when available, file/line context, and step count. Distinguish same-named files with parent path/tooltip.

### Controls
- Load Report (file picker); remember path and offer Reload Report.
- View by: Files / Folders / Error type. This is one mutually exclusive selector, not conflicting toggles.
- Active file only toggle: include findings with ANY step in the active file; preserve their FULL trace.
- Search/filter command (native input/filter UI where practical; no need to fake an embedded textbox in Tree View). Match type/label/message/path.
- Collapse All.
- Optional severity filter only if actual severity metadata exists; show Unknown explicitly.
- Separate display settings: CodeLens on/off; trace badges on/off; experimental trace lanes off by default.
- Refresh layout must not silently reload an old report or reset adjusted positions. Report reload is explicit.

Native tree controls can live in view title actions/menus; use a custom webview only if a justified design needs it. Avoid overbuilding an entire UI framework.

## Editor navigation and markers
Clicking a trace step opens its resolved source URI, reveals tracked line/column, selects/highlights its range, updates active finding/step, and reveals the corresponding sidebar occurrence. Clicking a finding chooses explicitly identified main event if known; otherwise first event as a navigation fallback only, without calling it the defect.

Opening a source file automatically shows its imported markers without first clicking the sidebar. Publish real diagnostic messages through DiagnosticCollection where appropriate. Supporting trace steps are context, not independent errors: use subdued decorations/hover markers rather than making every assignment an Error. Unknown impact should remain visibly unknown in metadata; any necessary VS Code diagnostic severity fallback must be documented as a display policy, not Coverity's rating. Use overview-ruler markers for document-wide orientation. Keep source=Coverity Report to distinguish compiler/language-service output. Avoid duplicate diagnostic text in combined hover UI.

If the report provides exact ranges, use them. Otherwise match the confirmed snippet on its reported/tracked line, trimming only outer whitespace. Preserve offsets into original document text. Use the reported column to disambiguate repeated matches; if ambiguous, mark uncertain rather than silently selecting an unrelated occurrence. A full-line snippet can highlight the statement/trimmed line; a partial snippet highlights only its matching region. Do not claim this identifies a semantically exact defect expression.

Do not strip all whitespace: internal spacing, strings, comments, and C token boundaries matter. Begin with exact matching. More sophisticated token-aware whitespace matching is optional. If no reliable match, use a small range at a valid reported position and indicate fallback. Never search the whole project and silently relocate to a coincidental match.

Support multiline ranges when a confirmed report format supplies a multiline snippet. Do not rebuild a multiline C statement from an incomplete snippet. Safely bound invalid locations; flag out-of-range/missing source instead of crashing. Verify report coordinate conventions, tabs, Unicode/UTF-16, and line-ending handling before claiming exact columns; VS Code positions are zero-based UTF-16, report conventions are not yet confirmed.

## Hover and trace navigation
Hover content should include original label, verified friendly event description if available, report message/snippet, finding type where known, current Step N of M, ordered trace locations, and Previous / Next actions. Every step links to its tracked file/line. Emphasize the current step. For several findings at one location, separate findings and require choosing one before ambiguous previous/next navigation.

Desired appearance: vertical timeline with circles numbered 1..M, current step bright/bold, others subdued and clickable. Attempt only styling supported by MarkdownString/safe HTML/theme icons. Standard VS Code hover is NOT an arbitrary HTML/CSS/React surface. Fallback: numbered Markdown list with current step bold and explicit Current label. Keep useful content and navigation even if timeline styling is unavailable. Long traces may need a compact neighborhood plus Show full trace link to sidebar/details.

Command links invoke extension-owned navigation commands, using allowlisted trusted command IDs and validated finding/event IDs. Escape report/source text; never trust report-supplied Markdown or command URIs. Clicking a link may close the hover; the sidebar and editor selection retain context. Do not promise a hover stays pinned across files.

Provide Previous Trace Step / Next Trace Step commands, optional configurable keybindings, and sidebar actions. Follow original trace order, NOT ascending line numbers. Cross-file navigation is required. At endpoints omit/disable unavailable direction; no silent wrapping. All surfaces share active finding/step state.

## Native Peek Problem versus custom details
Native Peek Problem is VS Code's built-in diagnostic UI. Supply diagnostic messages and related locations so native UI can expose them; verify exact presentation instead of promising a custom timeline. A public general API does not allow embedding an arbitrary HTML webview in native Peek Problem. Do not use unsupported internal DOM manipulation or private APIs to fake it.

Keep wording/order consistent across hover, diagnostics/Peek, sidebar, and optional details view. Share data/formatting/navigation logic; do not promise the exact same UI component can render in Markdown hover and native Peek. If a persistent rich timeline is needed, implement optional Trace Details as a webview in a bottom-panel view, sidebar view, or editor tab. That custom webview can share web UI components with other custom webviews. It is NOT the inline native Peek panel. Make rich details optional, not a blocker for core.

## CodeLens
Include as an optional supported feature, not forgotten scope. Display short context above relevant code, e.g. Possible NULL dereference · Step 3 of 5, using only known information. Clicking reveals/selects that finding. Optionally include Previous / Next commands. For multiple findings at a line, aggregate as 3 Coverity findings and offer a chooser rather than stacking many rows. Detailed explanations belong in hover/sidebar. Unknown checker uses neutral wording. CodeLens is clickable command text, not a custom gutter widget. Limit refresh cost and provide on/off setting.

## Gutter badges and lane brainstorming
These are optional enhancements, not core dependencies. Badges identify steps of the active finding only and retain original numbering across files. A bare 2 without finding context was considered confusing; tie it to sidebar/hover selection. Do not clutter gutter for every imported event.

Desired experimental graph: badges connected by arrows in trace order, possibly upward/downward; route overlapping connections into separate horizontal lanes, similar to a Git graph. Reuse nonconflicting lanes. If enabled, reserve a FIXED width (conceptually eight lanes, configurable) rather than resizing on every selection. Draw only active finding; overflow goes to full details view, never an ever-widening editor. Cross-file steps need navigation, not fictitious continuous arrows across separate editors.

IMPORTANT technical limitation: standard gutterIconPath decorations do not provide an arbitrary resizable canvas or separate left-click targets inside an icon. Do not assert that eight-lane gutter widening, continuous arrows, or previous/next clickable badge regions are supported. First verify stable public VS Code APIs with a bounded prototype. If unsupported, explicitly defer lanes and retain useful badges, hover links, CodeLens/toolbar commands, and keyboard navigation. No editor DOM hacks, VS Code fork, or replacement C editor for this project. A rich custom graph can live in Trace Details instead. Number of steps is not automatically number of required lanes.

## Edit tracking
Keep original report immutable. Subscribe to workspace.onDidChangeTextDocument, not caret moves/keystrokes, and handle all relevant documents, including nonvisible ones. Use changed ranges/offsets and replacement text to transform tracked ranges. Changes before a range shift it; changes after do not; overlaps mark it touched/uncertain. Define endpoint insertion affinity. Handle multiple disjoint edits in the event using pre-change coordinates correctly (e.g. descending-offset transformation), undo/redo, multiline edits, formatting, replace-all, tabs/Unicode and empty changes. Do not assume one edit or one visible file at a time.

Track current positions in one model and derive tree labels, diagnostics, hover links, and CodeLens from that model. Debounce expensive refreshes; do not reparse the full report per keystroke. A deleted target must not be attached confidently to unrelated code. Overlap is not proof of resolution. Optional user-reviewed status is separate from analysis-confirmed status. Undo can restore confidence only when baseline/content evidence justifies it.

Edits before report import or before extension activation cannot be recovered merely by listening to later events. Offer baseline mismatch/uncertain state and optional comparison with a supplied analyzed revision/snapshot. Do not pretend initial source matches report without evidence.

## Persistence/cache
Persist adjusted ranges (not a replay log of every keypress) in extension-owned workspace storage with schema version, report hash, normalized URI/path mapping identity, event IDs, range/status, and hash of the EXACT source content those positions reference. Keep original locations too.

On restart, reuse cache only when report identity and content fingerprints match. A changed report invalidates/reconciles cache explicitly. If source changed externally while closed, use a saved text baseline/diff to remap conservatively or mark stale and offer reset; a hash alone detects change, it cannot map offsets. Handle dirty/unsaved buffers: never save positions for an unsaved version with the disk version's hash. Flush safely/debounce writes and tolerate corrupt cache. Workspace storage is local, never silently synced/shared. Provide Reset adjusted locations with a clear consequence; do not rewrite report.

Handle file renames and external disk updates deliberately. Use supported events/file watching and compare document versions/content as appropriate. Do not claim onDidChangeTextDocument observes every file on disk. No automatic stale-location certainty after bulk external changes.

## Paths and source resolution
Resolve exact paths first, then explicit report-root -> workspace-root prefix mappings. Support Windows drive letters, slash normalization, case rules of the relevant filesystem, relative paths, spaces, multiple workspace roots, duplicate basenames, and external SDK/library paths. A path to Keil/CMSIS/header code is a legitimate trace location. Do not drop it because it is external. Unavailable paths appear as unresolved with a Configure path mapping action. Never pick a same-basename file silently or recursively scan the entire drive. Loading a report must not execute anything contained in it.

## Descriptions and impact
Use a bundled versioned lookup keyed separately by checker ID and event tag, retaining verified source URL/version and a short authored description. Start with labels actually encountered; do not scrape all proprietary documentation or invent full coverage. Some official docs are public, others may need licensed access. Publicly accessible does not imply unrestricted redistribution: prefer brief independently worded guidance and documentation links. Runtime works offline without lookups. Unknown label stays raw.

Example: var_deref_op -> Dereferencing a pointer; that alone does NOT assert the pointer is NULL. A FORWARD_NULL description concerns the overall checker. General guidance is visibly separate from report-specific content. Severity/Impact are finding metadata if provided, not derived from a friendly description. Report may omit them entirely.

## Architecture and practical priorities
Use modules for parser adapters, immutable model/indexes, path resolver, range tracker, persistence, view projection, diagnostics, hover, commands, CodeLens, and optional details/decorations. Keep a single active finding/event selection model. Use stable APIs and themes/accessibility; keyboard operation, focus, readable contrast, no color-only meanings. Avoid unnecessary dependencies. Report around 20,000 findings is plausible but unconfirmed: avoid eagerly creating all expanded UI nodes and do not reread all sources on activation.

Suggested implementation sequence (not permission to omit remaining supported requirements):
1. Scaffold extension and distributable folder build; synthetic fixtures and parser adapter; load report and expose warnings.
2. Canonical findings/file index, path mappings, default Files view, navigation.
3. Folders and Error type layouts, unique counts, filtering, selection persistence.
4. Diagnostics/decorations/overview ruler, range matching, hover and full trace navigation.
5. Edit tracking and fingerprinted restart cache.
6. Optional CodeLens and simple active-trace badges/settings.
7. Bounded gutter feasibility experiment; implement only supported useful outcome. Optional rich details if justified.

Ask for a sanitized real report sample only when needed to certify its parser; do not request proprietary source uploads. Document blockers honestly. Do not drop working core features while pursuing speculative lane graphics.

## Validation and acceptance
Use meaningful parser/range-tracker tests and a manual Extension Development Host checklist. Synthetic fixtures must cover numbered/unnumbered, single/multistep, cross-file, missing checker/impact, Windows and relative paths, colon-containing payloads, repeated snippets, multiline/unknown text, malformed records, duplicate basenames and findings. Range tests cover inserts/deletes before/inside/after, same-line columns, multiline replacement, multiple edits, undo/redo, Unicode, deletion, restart cache match/mismatch and unsaved buffers.

Acceptance scenarios:
- Open project as ordinary folder; no build setup; load report; see parse counts and warnings.
- Files default, Folders only adds folder parents, Error type uses actual checker ID/Unknown; all retain full traces and consistent state.
- One finding touching A/B/C is referenced under each involved file but counted once globally.
- Click each step, including cross-file, and land at correct adjusted location. Unresolved source offers mapping, not wrong navigation.
- Open source directly: markers/hover appear automatically. Known snippet is highlighted; uncertain match is flagged/fallback.
- Hover shows label, optional verified explanation and current step; step links and previous/next stay within chosen finding.
- CodeLens can be toggled, concise, and aggregates collisions.
- Editing before a target shifts line/column consistently in all surfaces; overlapping edits become unverified, never auto-fixed.
- Restart restores positions only against matching content; changed files/report produce a clear stale/reset path.
- Original report bytes unchanged; no network/build/debug actions.
- Ready-to-copy folder loads after proper installation/restart with no npm install on target. Verify compiled main file exists and runtime assets resolve.
- No unsupported gutter/Peek promises. End with implemented features, tests actually run, known limitations and installation steps.

## Official references for verification
- Folder installation/distribution: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- API reference (TreeDataProvider, DiagnosticCollection, HoverProvider, MarkdownString, CodeLens, change events, decoration options): https://code.visualstudio.com/api/references/vscode-api
- Tree View: https://code.visualstudio.com/api/extension-guides/tree-view
- Command links: https://code.visualstudio.com/api/extension-guides/command
- Webviews and their supported locations: https://code.visualstudio.com/api/extension-guides/webview
- Language features: https://code.visualstudio.com/api/language-extensions/programmatic-language-features
- Coverity example distinguishing checker and event tag: https://docs.blackduck.com/r/coverity/latest/coverity-documentation/c/c-code-line-annotations.html

Verify current APIs and actual host behavior during implementation. The report grammar in this document is provisional; no real report was available during the brainstorming session.

## Added requirement: optional Rerun Coverity through WSL/Docker
This explicitly extends the earlier viewer-only scope. Keep ordinary report viewing fully usable without execution setup; add an optional user-configured rerun workflow. Do not integrate application build/debug or infer the actual Coverity invocation.

The user's existing workflow switches to WSL, runs a command in a Linux folder, and invokes Coverity through Docker. The exact distro, Linux working directory, Docker invocation, volume mappings, credentials, output report path and export steps are not yet supplied. Implement configuration hooks and document placeholders; do not invent a working command or assume Docker Desktop versus a daemon inside WSL.

- Add Rerun Coverity to the Findings view title toolbar/menu. First use opens configuration if missing; do not ask on every properly configured run. Workspace execution configuration is executable code: require VS Code Workspace Trust and explicit initial setup before running it. Never obtain commands from report contents.
- Configure WSL distro (or explicit default), Linux working directory, existing trusted script/command, arguments, and resulting report path as seen by VS Code. Prefer invoking a known Linux wrapper script via wsl.exe with separate arguments and --cd/--exec where supported. When a shell is necessary for Docker commands/pipelines, handle quoting deliberately; never interpolate unescaped report text or paths into shell code.
- A VS Code Task or visible terminal is a suitable execution surface. Show stdout/stderr, running/succeeded/failed/cancelled state, and prevent duplicate concurrent reruns. Offer cancellation through supported task/process controls; clarify that stopping a local launcher may not stop a Docker container. Do not promise cancellation of the container unless actually implemented and verified; do not kill unrelated containers/processes.
- Explain/configure Windows-to-WSL-to-container source/report path mappings independently of report-location mappings. Use the actual WSL folder and Docker mounts from user setup. Missing distro/working directory/Docker/service/report produces an actionable error.
- Save source files before execution only according to an explicit setting/user choice; warn when unsaved changes would be excluded. Unsaved editor positions are not a valid analyzed baseline.
- Keep the previous report and cache visible while running. On successful command completion, verify a newly generated, complete report exists and is readable; do not reload an unchanged old report just because exit code is zero. Prefer a wrapper producing a temporary report then atomically replacing the destination, or another verified completion signal. Do not rely only on file modification time as proof of a fresh result.
- Analysis commands may use nonzero exits for findings versus execution errors: allow documented wrapper/success-exit policy based on the user's real command. Never assume every nonzero code means analysis failed, or every zero means a report was produced.
- Parse the completed report, then replace the active report/model atomically, refresh all views/diagnostics/hover/CodeLens and initialize new location tracking against the ACTUAL analyzed source revision/snapshot. Source edits during the run mean current files can differ from analyzed files: compare/remap conservatively or mark stale. Never assume completion-time source equals analysis input.
- Do not carry old adjusted ranges into a different report blindly. Preserve selection/triage only with verified stable identifiers or explicit conservative matching. A missing finding counts as resolved only when a comparable complete scan supports that conclusion; do not infer it from a failed, partial, filtered or differently scoped report.
- On failed/cancelled run or parse failure, retain the previous valid report, show the outcome and leave source edits intact. Do not silently clear findings.
- No WSL/Docker execution during report import or workspace opening. Execution occurs only from the user's Rerun action or another explicitly invoked command.
- Add manual acceptance checks for unconfigured setup, successful new report, stale report output, failure, cancellation, duplicate run, path spaces, cross-environment paths, unsaved files, and edits made during analysis. Verify with a harmless wrapper fixture when real secure-lab tooling is unavailable; report real integration as untested until exercised there.

User follow-up needed during implementation: obtain the exact existing WSL/Docker command or wrapper, distro, working folder, output location, success semantics and whether a separate export stage generates this text format. A sanitized command structure is sufficient; do not request secrets or proprietary source.

## Optional advanced feature: compare previous and current runs
Add this as an explicitly OPTIONAL advanced enhancement, not a prerequisite for the report navigation helper. User runs take roughly eight minutes and are typically invoked after manually addressing a batch of 20–30 findings; do not automatically rerun on edits/saves. Git diff shows source changes; this feature compares analysis results.

- Add Compare Runs / Show changes since previous run, default off, available after two valid report snapshots. Keep the previous successful snapshot before replacing the active report. Allow choosing previous/current imported snapshots where practical; bounded local history and clear/reset controls prevent unlimited retention.
- Show unique finding counts and filterable groups: New, Still reported, No longer reported, and Uncertain matches. An optional compact summary could say 12 no longer reported, 3 new, 80 still reported, 2 uncertain, but use actual data only. Apply existing Files/Folders/Error type layouts and preserve full traces.
- Prefer actual stable Coverity identifiers/merge keys when exported and verify their scope across runs. Report-local generated IDs do not establish cross-run identity. Without stable IDs, use conservative matching with checker/type, normalized paths, snippets/context and trace evidence, accounting for tracked line shifts. Line/column alone is not a stable key. Distinguish heuristic matches and ambiguous duplicates; do not force uncertain one-to-one matches or silently overcount resolution/new findings.
- No longer reported is the default wording, not Fixed. A complete comparable scan with the same scope/checkers/settings and analyzed baseline is needed to interpret disappearance as evidence of resolution. Store available run metadata; when comparability is unknown or different, surface that limitation and avoid claiming verified fixes. Failed/cancelled/partial runs must not replace the successful comparison baseline.
- Historical findings retain old locations/snippets; do not publish them as current errors or navigate confidently to obsolete positions. Offer original report context or a safely remapped location marked historical/uncertain. Current findings use current report tracking normally.
- Preserve source edits, original reports and caches. Keep user-reviewed statuses separate from scan comparisons. Comparison runs locally and makes no source uploads.
- Include tests for shifted lines, identical duplicates, checker/scope changes, stable-ID matches, missing IDs, ambiguous heuristic matches, successful disappearance, new findings, malformed/failed scan and history selection. Implement after core features if feasible; otherwise document it clearly as deferred optional work rather than claiming it exists.

## User clarification: adaptable, easy-to-edit report grammar
Proceed using the user's described text format now; do not block implementation waiting for a real report. Treat it as the initial assumed grammar, not verified universal Coverity syntax. The user will inspect the actual report later and may manually change the parser code.

Make those changes straightforward:
- Put the location-line, optional event-number, label/colon/payload, finding-boundary and continuation rules together in one small, clearly named parser adapter, e.g. src/parser/textReportParser.ts. Keep patterns/constants near the top with readable names, comments and short examples. Avoid scattered regular expressions or an unnecessarily elaborate parser framework.
- Isolate the second-line interpretation particularly clearly: optional N. prefix -> label -> separator colon -> remaining source/message payload. Preserve raw text. Make it obvious where to change the separator, numbering, indentation, snippet extraction or message handling when the actual sample differs.
- Separate recognition of location/event lines from grouping records into findings and from classifying payload as snippet/message. A change to one should not require rewriting UI, path resolution, tracking or persistence.
- Include a short PARSER_FORMAT.md (or equivalent README section): assumed input examples, parsed output examples, the exact functions/constants to edit for each rule, how multiline continuation is handled, and one command to run focused parser fixtures/tests.
- Add compact annotated synthetic fixtures for a single unnumbered event, single numbered event, numbered cross-file trace, and source text containing colons. Include expected normalized results. Make it easy to paste a sanitized new block into a fixture and inspect its parsed finding/events.
- Provide a local parser-inspection command or development script that prints structured parser output and warnings for a chosen sample report, without executing source or uploading it. Surface unrecognized lines with original report line numbers so grammar changes are easy to diagnose.
- Keep optional summary handling and blank-line boundary rules explicit and replaceable; no hardcoded dependency on the first-line count.
- Preserve the canonical model contract when adapting format rules. Include a regression fixture with each later grammar adjustment. Do not silently discard unmatched lines or guess that an unknown record is a valid finding.

This clarification overrides any suggestion that a real report is required before beginning implementation. A real sample is still required before claiming the parser is verified against the user's actual output.
