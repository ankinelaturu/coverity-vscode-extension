# Coverity Report Helper (extension package)

**Extension ID:** `anki.coverity-report-helper` · **Version:** 0.1.0

JavaScript VS Code/Cursor extension (no npm) for **cov-format-errors multiline** reports.

## Install in Cursor / VS Code

Copy or symlink **this folder** (must keep the name `anki.coverity-report-helper-0.1.0`) into the user extensions directory:

- **Cursor (macOS/Linux):** `~/.cursor/extensions/`
- **VS Code (macOS/Linux):** `~/.vscode/extensions/`
- **Windows:** `%USERPROFILE%\.cursor\extensions\` or `%USERPROFILE%\.vscode\extensions\`

Replace `REPO` with the absolute path to this repository’s `coverity-vscode-extension` directory.

**Cursor (symlink):**

```bash
ln -sf "REPO/anki.coverity-report-helper-0.1.0" \
  "$HOME/.cursor/extensions/anki.coverity-report-helper-0.1.0"
```

**VS Code (symlink):**

```bash
ln -sf "REPO/anki.coverity-report-helper-0.1.0" \
  "$HOME/.vscode/extensions/anki.coverity-report-helper-0.1.0"
```

**This machine (example):**

```bash
REPO="$HOME/.cursor/extensions/coverity-vscode-extension"
ln -sf "$REPO/anki.coverity-report-helper-0.1.0" "$HOME/.cursor/extensions/anki.coverity-report-helper-0.1.0"
ln -sf "$REPO/anki.coverity-report-helper-0.1.0" "$HOME/.vscode/extensions/anki.coverity-report-helper-0.1.0"
```

Then **Developer: Reload Window** in Cursor or VS Code.

## UI (no separate sidebar)

There is **no Coverity activity bar panel**. After loading a report:

- **Explorer** — badges and colors on **files and folders** (rollup), severity tint, multi-line tooltips listing findings
- **Badge style** (`coverity.explorerBadgeStyle`): `duck` (default: `🦆1`–`🦆9`, or `🦆+` for 10+), `count` (numeric only), or legacy `brand` (same as `duck`)
- **Extension icon** — `media/duck.svg` (Extensions list only; **not** in the file tree)
- **Problems** — filter by source `Coverity Report`
- **Editor** — squiggles, hover with SVG trace timeline + clickable steps, optional CodeLens, Alt+Shift+Up/Down for trace steps
- **COV trace strip** (optional) — `coverity.traceBadgesEnabled` defaults to **off**. When **on**, step markers render in the line-decorations column between line numbers and code; set `editor.lineDecorationsWidth` (e.g. **72px**) if needed. Connectors: `coverity.traceStripConnectors` (default **off**). Lanes: `coverity.experimentalTraceLanes` (default **on**). Hover timeline and CodeLens still work with the strip off.

**Trace peek** — Native Problems peek stays a one-line diagnostic message. For the full trace, run **Coverity: View Coverity Trace Peek** (Command Palette) or the **Coverity: View full trace peek** code action on a squiggle. Opens a side panel with every trace step in order, ±2 lines of context, and the current step highlighted.

**Diagnostic severity:** the **last trace step** (main occurrence) is published as **Warning**; earlier steps are **Information** (context only). Source is always `Coverity Report`. Overview ruler highlights active vs other steps of the same finding when trace badges are enabled.

**Explorer badge vs Coverity duck logo:** VS Code’s `FileDecorationProvider` only allows a **short text badge** (1–2 characters) and **theme colors**, not custom images. You cannot put the official Coverity duck PNG in the tree. Default badge is **🦆1**–**🦆9** (unique findings on that file/folder) or **🦆+** when count ≥ 10 (exact count in tooltip). Use `"count"` for numeric-only badges.

Commands: **Command Palette** → `Coverity:` …

### Stale Coverity icon on the activity bar

Version **0.1.1+** no longer contributes a sidebar. If you still see an empty **Coverity** shield after reload:

1. **Right‑click the activity bar** (left strip) → uncheck **Coverity**.
2. Or **Command Palette** → **View: Reset View Locations**.
3. **Quit Cursor completely** (not only Reload Window) and reopen.

## Parser dev helper

From this folder:

```bash
node scripts/inspect-report.js /path/to/report.txt
```

## Friendly descriptions (offline)

Bundled `src/lookup/descriptions.json` adds short **checker** and **event tag** hints in hover and Problems. Unknown labels fall back to raw report text only — not Coverity proprietary documentation. Edit the JSON to extend coverage for your checkers.

## Path resolution

- Report paths may be **absolute** (Windows drive letters supported) or **relative to the workspace folder root** (not the report file’s directory).
- **Multi-root:** each folder root is tried; use **Coverity: Configure Path Mapping** for `reportPrefix` → `workspaceFolder` when build paths differ from the repo layout.
- Unresolved steps stay visible in Problems/hover with a mapping hint; the extension never runs or executes path strings from the report.

## Sample workspace

Use the sibling **`my-repo/`** at the repository root (open as its own window). Default report: `deploy/coverity/coverity-report.txt`.

Project design docs: `../docs/README.md`
