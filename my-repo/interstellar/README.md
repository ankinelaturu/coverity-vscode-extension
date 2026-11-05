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
