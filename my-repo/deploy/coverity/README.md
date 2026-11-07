# Coverity report (deploy output)

Synthetic **`cov-format-errors --text-output-style multiline`**-style text for the Interstellar demo (includes **MISRA** and **FORWARD_NULL** `Type:` lines, CIDs, and numbered trace events).

**Path convention:** Location lines use paths **relative to the project root** (`my-repo/`), not relative to this file. Example: `interstellar/src/main.c` → `my-repo/interstellar/src/main.c` when `my-repo` is the workspace folder.

Absolute paths (e.g. `/Users/…/c-keil-root/...`) are used as-is.

**Format reference:** [docs/PARSER_FORMAT.md](../../../docs/PARSER_FORMAT.md)

**Multi-finding same line (manual testing)**

| File (under `my-repo/`) | Report CIDs |
|-------------------------|-------------|
| `interstellar/lib/log/log_format.c:7` | 90002, 90008 |
| `interstellar/src/multi_finding_line.c:14` | 90200, 90201, 90202 |

Reload `coverity-report.txt` in the extension and open those lines to verify rule `i/k`, Problems count, and per-line finding memory.
