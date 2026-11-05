# Coverity Report Helper (extension package)

**Extension ID:** `anki.coverity-report-helper` · **Version:** 0.1.0

JavaScript VS Code/Cursor extension (no npm) for **cov-format-errors multiline** reports.

## Install in Cursor / VS Code

Copy or symlink **this folder** (must keep the name `anki.coverity-report-helper-0.1.0`) into the user extensions directory:

- macOS/Linux: `~/.cursor/extensions/` or `~/.vscode/extensions/`
- Windows: `%USERPROFILE%\.cursor\extensions\`

Example symlink from the repo:

```bash
ln -sf "/path/to/coverity-vscode-extension/anki.coverity-report-helper-0.1.0" \
  "$HOME/.cursor/extensions/anki.coverity-report-helper-0.1.0"
```

Then **Developer: Reload Window**.

## Parser dev helper

From this folder:

```bash
node scripts/inspect-report.js /path/to/report.txt
```

## Sample workspace

Use the sibling **`my-repo/`** at the repository root (open as its own window). Default report: `deploy/coverity/coverity-report.txt`.

Project design docs: `../docs/README.md`
