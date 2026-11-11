# Report text format — cov-format-errors multiline (primary)

**Status:** Synthetic sample aligned to [cov-format-errors multiline](https://docs.blackduck.com/r/coverity/2026.3/coverity-documentation/cov-format-errors.html) / `--emacs-style` (see also [Reviewing defects](https://docs.blackduck.com/r/coverity/2026.9/coverity-documentation/reviewing-defects.html)). Not yet verified against the user’s production export.

**Fixture:** `my-repo/deploy/coverity/coverity-report.txt`  
**Implementation home:** `anki.coverity-report-helper-0.1.0/src/parser/textReportParser.js`  
**Related:** [DESIGN.md](./DESIGN.md) §6, [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md)

**Terminology:** One parsed occurrence block = Coverity **issue** (stored as `findings[]` in code). Each `N. tag: message` line = **event** (`events[]`).

---

## 1. Canonical sample block (from Interstellar fixture)

```text
interstellar/src/nav_reader.c:13:9: CID 90001 (#1 of 1):
  Type: Explicit null dereferenced (FORWARD_NULL)
  …

interstellar/src/nav_reader.c:12:9:
  1. condition_true: Condition "nav_simulate_probe_fault()", taking true branch.
interstellar/src/nav_reader.c:13:9:
  2. returned_null: return NULL;
interstellar/src/nav_helpers.c:7:5:
  3. assignment: active_nav_reader = reader;
interstellar/src/thruster_control.c:6:5:
  4. var_assign: Assigning: "reader" = "nav_active_reader()" return value.
interstellar/src/thruster_control.c:7:5:
  5. var_deref_op: Dereferencing null pointer "reader".
```

Four-step trace in one file (CID 90003, `buffer_ops.c`): steps 1–4 all under `interstellar/src/buffer_ops.c`.

MISRA example (same file):

```text
interstellar/lib/log/log_format.c:7:5: CID 90002 (#1 of 1):
  Type: MISRA C-2012 Standard Libraries (MISRA C-2012 Rule 21.6, Advisory)

interstellar/lib/log/log_format.c:7:5:
  1. misra_c_2012_rule_21_6_violation: Use of library function "printf".
```

**Multiple findings, one line** (extension fixtures):

| Source line | CIDs | Scenario |
|-------------|------|----------|
| `interstellar/lib/log/log_format.c:7:5` | 90002, 90008 | Same line **and column** |
| `interstellar/src/multi_finding_line.c:14` | 90200, 90201, 90202 | Same line, **different columns** (5, 20, 35) |

---

## 2. Line kinds

| Kind | Example | Parser use |
|------|---------|------------|
| **Summary** | `Detected 7 defect occurrences...` | Preserve; do not use for navigation or counts |
| **Occurrence header** | `path:line:col: CID … (#1 of 1):` | Start/anchor finding; optional CID |
| **Metadata** | `  Type: … (FORWARD_NULL)` | **Checker ID** = text in final `(PARENS)`; human title before parens |
| **Metadata** | `  Classification:`, `  Severity:` | Optional triage fields |
| **Location** | `path:line:col:` (trailing colon) | Next line(s) are events for this location |
| **Event** | `  N. tag: message` | Trace step; **tag is not checker ID** |
| **Blank line** | | End finding block (provisional boundary) |

**Checker vs event tag (#7):** Group **Error type** by parsed checker from `Type:` (e.g. `FORWARD_NULL`, `MISRA C-2012 Rule 18.1`). Do **not** group by `var_deref_op`, `misra_c_2012_rule_21_6_violation`, etc.

---

## 3. Structural rules

| Rule | Behavior |
|------|----------|
| Line endings | CRLF or LF; strip BOM once at file start |
| Finding boundary | Blank line between occurrences; metadata + trace belong to same finding until blank line |
| Location line | Path + `:line` + `:column` + optional `: CID …` + trailing `:`; preserve Windows `C:\` paths |
| Paths with spaces | e.g. `interstellar/src/heat shield.c:7:9:` |
| Absolute paths | Resolve as-is (e.g. `~/c-keil-root/...`) |
| Workspace-relative paths | Resolve against **workspace / project root**, not report file directory |
| `Type:` line | Regex: `Type:\s*(.+)\(([^)]+)\)\s*$` for title + checkerId (adjust for MISRA titles with nested parens) |
| Event line | Leading whitespace; optional `N.` / nested `N.M.` **or** (after a location line) `tag: message` with **no** step number — auto-numbered `1`, `2`, … within the finding |
| **Type (no checker)** | `Type: Unnecessary Header files` — whole line is title; synthetic checker id from title (e.g. `UNNECESSARY_HEADER_FILES`) |
| Unknown lines | Warning + line number; never silently drop |

**MISRA `Type:` lines** often look like:

`Type: MISRA C-2012 Arrays (MISRA C-2012 Rule 18.1, Required)`

Use the **last parenthetical group** or a dedicated MISRA rule extractor when implementing; document choice in [DECISIONS_LOG.md](./DECISIONS_LOG.md).

---

## 4. Location line parsing (edit here first)

Examples in fixtures:

| Input | Path | Line | Col | CID |
|-------|------|------|-----|-----|
| `interstellar/src/main.c:9:5:` | `interstellar/src/main.c` | 9 | 5 | — |
| `interstellar/src/main.c:9:5: CID 90005 (#1 of 1):` | `interstellar/src/main.c` | 9 | 5 | 90005 |
| `/Users/me/c-keil-root/.../thruster_control.c:7:5: CID 90007 (#1 of 1):` | absolute | 7 | 5 | 90007 |

---

## 5. Event line parsing (edit here second)

| Raw line | Step | Label | Payload |
|----------|------|-------|---------|
| `  3. var_deref_op: Dereferencing null pointer "reader".` | 3 | `var_deref_op` | `Dereferencing null pointer "reader".` |
| `  2. format_string: printf("SYS:%s:READY", subsystem);` | 2 | `format_string` | `printf("SYS:%s:READY", subsystem);` |
| `  1.1. condition_true: Condition "x", taking true branch.` | 1.1 | `condition_true` | (payload) |

Nested steps (fixture **CID 90100**, `nested_demo.c`): `1.`, `1.1.`, `1.2.`, `2.`, `2.1.`, `3.` — parsed as flat `events[]` with `stepPath` / `stepDepth`; UI indents sub-steps.

---

## 6. Parsed output shape (conceptual)

```json
{
  "id": "90001",
  "checkerId": "FORWARD_NULL",
  "typeTitle": "Explicit null dereferenced",
  "classification": "Unclassified",
  "severity": "Unspecified",
  "events": [
    {
      "stepNumber": 1,
      "label": "returned_null",
      "rawPayload": "return NULL;",
      "location": { "rawPath": "interstellar/src/nav_reader.c", "line": 13, "column": 9 }
    }
  ]
}
```

---

## 7. Legacy trace-only format (deprecated in fixture)

Earlier synthetic format (location + event only, no `Type:`) may still appear in old notes. Parser may support as fallback with `checkerId: null`. Current demo file uses **multiline only**.

---

## 8. How to change the grammar

1. Edit parser module (`anki.coverity-report-helper-0.1.0/src/parser/textReportParser.js`).
2. Update `my-repo/deploy/coverity/coverity-report.txt` and this doc.
3. Note changes in [NOTES.md](./NOTES.md) / [DECISIONS_LOG.md](./DECISIONS_LOG.md).

---

## 9. Verification checklist

- [x] Synthetic multiline fixture in repo (Interstellar)
- [ ] Compared field-by-field to user’s real `cov-format-errors` export
- [ ] MISRA `Type:` parenthesis parsing validated on real line
- [ ] Mark **Verified** in [NOTES.md](./NOTES.md) when done
