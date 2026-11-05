# Open questions and verification gaps

Items here block **claims** (e.g. “parser verified”, “lanes supported”), not necessarily all coding. Move to [DECISIONS_LOG.md](./DECISIONS_LOG.md) when resolved; note outcome in [NOTES.md](./NOTES.md).

**Priority:** P0 = blocks verification/sign-off · P1 = blocks optional feature · P2 = nice to clarify

---

## Report format (P0 for “verified parser”)

| ID | Question | Impact | Owner |
|----|----------|--------|-------|
| OQ-001 | Exact native export layout: summary line, checker headers, CID, impact, main-event marker? | Parser fields, Error type view, severity filter | User sample |
| OQ-002 | Line/column base (1-based vs 0)? Column meaning with tabs? | Range matching | User sample + spot check |
| OQ-003 | Multiline event payloads and wrapped source — continuation rules? | Boundary logic, warnings | User sample |
| OQ-004 | Are blank lines always finding separators? | False splits vs merged findings | User sample |
| OQ-005 | UTF-16 vs code units for columns in export | VS Code position mapping | User sample |

**Workaround until resolved:** Provisional grammar in [PARSER_FORMAT.md](./PARSER_FORMAT.md); label **Assumed** in UI/docs.

---

## Scale and performance (P2)

| ID | Question | Impact |
|----|----------|--------|
| OQ-010 | Typical and max finding count in user projects? | Tree lazy-load thresholds |
| OQ-011 | Typical report file size? | Parse time, memory |

---

## Path and workspace (P1)

| ID | Question | Impact |
|----|----------|--------|
| OQ-020 | Default report-root relative to Keil project vs VS Code workspace root? | Default mapping suggestions |
| OQ-021 | Common external path prefixes (CMSIS, Keil packs)? | Built-in mapping templates? |

---

## Editor / API behavior (P1)

| ID | Question | Impact |
|----|----------|--------|
| OQ-030 | What does native Peek show for related diagnostics + custom source? | Hover/diagnostic wording |
| OQ-031 | Gutter decoration API sufficient for badges only, not lanes? | M13 spike outcome |

---

## Rerun Coverity — optional (P1 for feature)

| ID | Question | Impact |
|----|----------|--------|
| OQ-040 | Exact WSL distro name and `wsl.exe` invocation pattern? | Rerun config |
| OQ-041 | Linux working directory inside WSL? | `--cd` / script cwd |
| OQ-042 | Full Docker command or wrapper script (redacted structure OK)? | Task definition |
| OQ-043 | Report output path as seen from Windows VS Code? | Reload after run |
| OQ-044 | Success exit codes vs findings present? | Do not treat nonzero as failure incorrectly |
| OQ-045 | Separate export step from analysis to this text format? | Completion detection |
| OQ-046 | Save-all before run required? | Default setting |

**User follow-up (from prompt):** Sanitized command structure sufficient; no secrets.

---

## Compare runs — optional (P2)

| ID | Question | Impact |
|----|----------|--------|
| OQ-050 | Does export include stable merge keys / CID across runs? | Compare accuracy |
| OQ-051 | Are scan scope/checkers guaranteed identical between runs? | “No longer reported” wording |

---

## Extension identity (P2)

| ID | Question | Impact |
|----|----------|--------|
| OQ-060 | Publisher id and public name (`local.coverity-report-helper` vs other)? | Folder name, `package.json` |

---

## Resolution log (append-only)

| Date | ID | Resolution |
|------|-----|------------|
| — | — | — |
