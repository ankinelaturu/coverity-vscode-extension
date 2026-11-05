# coverity-vscode-extension (repository)

Monorepo for the Coverity report navigation extension and sample project.

| Path | Purpose |
|------|---------|
| **[anki.coverity-report-helper-0.1.0/](./anki.coverity-report-helper-0.1.0/)** | **Installable extension** — symlink into `~/.cursor/extensions/` and/or `~/.vscode/extensions/` |
| **[my-repo/](./my-repo/)** | Sample firmware + synthetic report (open as workspace to test) |
| **[docs/](./docs/)** | Design, checklist, parser format, acceptance |

## Quick start

1. Symlink `anki.coverity-report-helper-0.1.0` (see extension README for Cursor + VS Code `ln` commands).
2. Reload Cursor or VS Code.
3. Open **`my-repo`** in a window → load report (auto or **Coverity: Load Report**) → see **Explorer** badges and **Problems**.

See [anki.coverity-report-helper-0.1.0/README.md](./anki.coverity-report-helper-0.1.0/README.md) for commands, settings, and limitations.
