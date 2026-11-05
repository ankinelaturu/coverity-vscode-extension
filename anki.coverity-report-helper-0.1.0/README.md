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
- **Editor** — squiggles, hover trace links, optional CodeLens, Alt+Shift+Up/Down for trace steps

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

## Sample workspace

Use the sibling **`my-repo/`** at the repository root (open as its own window). Default report: `deploy/coverity/coverity-report.txt`.

Project design docs: `../docs/README.md`
