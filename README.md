# Coverity Report Helper

JavaScript VS Code extension (no npm required) that loads **cov-format-errors multiline** text reports and navigates findings in C/C++ workspace sources.

## Install (this repo)

This folder is the extension root. After changes, **reload Cursor/VS Code** (`Developer: Reload Window`).

For another machine, copy the whole folder into the user extensions directory (not the project `.vscode` folder):

- macOS/Linux: `~/.vscode/extensions/` or `~/.cursor/extensions/`
- Windows: `%USERPROFILE%\.vscode\extensions\`

## Try the sample

1. Open **`my-repo`** as a separate workspace window.
2. Ensure `deploy/coverity/coverity-report.txt` exists (default).
3. Reload — auto-load uses setting `coverity.defaultReportPath` (default `deploy/coverity/coverity-report.txt`).
4. Open the **Coverity** activity bar → **Coverity Findings**.

External absolute path sample: `/Users/ankinelaturu/c-keil-root/...` (see `my-repo/README.md`).

## Commands

| Command | Purpose |
|---------|---------|
| Coverity: Load / Reload Report | Pick or refresh report file |
| View by: Files / Folders / Error Type | Command palette |
| Coverity: Filter / Active File Only | Narrow tree |
| Previous / Next Trace Step | `Alt+Shift+Up/Down` when report loaded |
| Configure Path Mapping | JSON prefix maps in settings |
| Reset Adjusted Locations | Drop cached range adjustments |

## Settings (workspace)

- `coverity.autoLoadReport` — default `true`
- `coverity.defaultReportPath` — relative to **workspace root**
- `coverity.pathMappings` — map report prefixes (e.g. `C:\build\...`) to folders
- `coverity.codeLensEnabled`, `coverity.traceBadgesEnabled`
- `coverity.experimentalTraceLanes` — reserved (not implemented)
- `coverity.rerun.*` — placeholder hooks for WSL/Docker rerun
- `coverity.compareRunsEnabled` — optional compare (basic placeholder)

## Diagnostics display policy

Trace steps use **Warning** on the last event in each finding and **Information** on supporting steps. Source is `Coverity Report` (not compiler/LSP). Unknown Coverity severity is not inferred from step tags.

## Known limitations

- Report grammar targets documented multiline `Type:` + trace format; see `docs/PARSER_FORMAT.md`.
- Gutter lane graph deferred (public API); step badges for active finding only.
- Rerun/compare require user configuration; not wired to lab Docker yet.
- M-final packaging/acceptance checklist not automated.

## Documentation

See [docs/README.md](./docs/README.md) for design, checklist, and acceptance matrix.
