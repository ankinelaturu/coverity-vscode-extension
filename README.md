# coverity-vscode-extension (repository)

Monorepo for the Coverity report navigation extension and sample project.

| Path | Purpose |
|------|---------|
| **[anki.coverity-report-helper-0.1.0/](./anki.coverity-report-helper-0.1.0/)** | **Installable extension** (`package.json`, `extension.js`, `src/`) — symlink or copy into `~/.cursor/extensions/` |
| **[my-repo/](./my-repo/)** | Sample firmware + synthetic report (open as workspace to test) |
| **[docs/](./docs/)** | Design, checklist, parser format, acceptance |

## Quick start

1. Symlink or copy `anki.coverity-report-helper-0.1.0` to `~/.cursor/extensions/anki.coverity-report-helper-0.1.0`.
2. Reload Cursor.
3. Open **`my-repo`** in a window → Coverity activity bar → **Coverity Findings**.

See [anki.coverity-report-helper-0.1.0/README.md](./anki.coverity-report-helper-0.1.0/README.md) for commands, settings, and limitations.
