# Project notes (living)

Use this file for **day-to-day capture**: discoveries, user feedback, sample report quirks, test session results, and ideas that are not yet decisions.

For firm choices, use [DECISIONS_LOG.md](./DECISIONS_LOG.md). For blockers, use [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md).

---

## 2026-11-04 — Documentation bootstrap

- Created design doc, implementation checklist, parser format guide, acceptance checklist, decisions log, open questions, and docs index.
- Repo still contains **no extension source**; next step when ready is M1 in [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md).
- Synthetic report updated to **cov-format-errors multiline** shape (`Type:`, CID, MISRA + FORWARD_NULL); see `my-repo/deploy/coverity/coverity-report.txt` and `PARSER_FORMAT.md`. Still **not verified** against user’s live export.

---

## Template — session note

```markdown
### YYYY-MM-DD — Short title

- **Context:**
- **Observed:**
- **Action items:** (link checklist ids)
- **Verification:** Assumed | Verified | Deferred
```

---

## Ideas backlog (un triaged)

- _(none yet)_

---

## Sample report snippets (sanitized)

**Interstellar demo (in-repo):** `my-repo/interstellar/` + `my-repo/deploy/coverity/coverity-report.txt` (source paths in report relative to `my-repo/` root). Hand-authored **synthetic** report for parser/UI fixtures; not a verified Coverity export. Open workspace folder `my-repo` for relative paths. External absolute-path finding: `/Users/ankinelaturu/c-keil-root/interstellar/src/thruster_control.c` (+ `include/nav_reader.h`).

```text
(paste additional snippets here)
```

---

## Test sessions

| Date | Host (VS Code / Cursor / version) | Scope | Result | Notes |
|------|-------------------------------------|-------|--------|-------|
| — | — | — | — | — |
