# Interstellar — synthetic demo firmware

Small C sample used to exercise the Coverity report helper extension. Sources intentionally contain patterns static analysis would flag (null dereference paths, buffer overrun, dead code, format strings with colons).

## Layout

| Path | Role |
|------|------|
| `include/` | Shared headers |
| `src/` | Application and drivers |
| `lib/log/` | Logging helper |

## Build (optional)

Not required for the extension. Example:

```bash
cd interstellar
cc -Iinclude -Isrc -o demo \
  src/main.c src/nav_reader.c src/nav_helpers.c \
  src/thruster_control.c src/buffer_ops.c \
  "src/heat shield.c" lib/log/log_format.c
```

## Report

Pair with [`../deploy/coverity/coverity-report.txt`](../deploy/coverity/coverity-report.txt). Open **`my-repo`** as the workspace folder; report paths like `interstellar/src/main.c` are relative to **`my-repo`**, not to `deploy/coverity/`.

The report is **synthetic** multiline output (MISRA + FORWARD_NULL `Type:` lines), modeled on `cov-format-errors --text-output-style multiline`, not a verified export from your pipeline.

**Trace demos in the fixture**

| CID | Shape |
|-----|--------|
| **90001** | **5 steps** across **3 files** (`nav_reader.c`, `nav_helpers.c`, `thruster_control.c`) |
| **90003** | **4 steps** in **one file** (`buffer_ops.c`) |

**Multiple findings on one line** (CodeLens rule carousel, two Problems rows per line)

| Where | CIDs | Notes |
|-------|------|--------|
| `lib/log/log_format.c` **line 7** | **90002**, **90008** | Same **line:column** (7:5); MISRA Rule 21.6 + `PRINTF_ARGS` |
| `src/multi_finding_line.c` **line 14** | **90200**, **90201**, **90202** | Same line, **different columns** (14:5, 14:20, 14:35); null deref + MISRA 18.1 + printf |
