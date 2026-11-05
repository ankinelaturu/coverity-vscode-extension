# Coverity Report Helper — documentation index

This folder holds **living project docs** for the VS Code extension described in [CURSOR_COVERITY_EXTENSION_PROMPT.md](./CURSOR_COVERITY_EXTENSION_PROMPT.md). The prompt remains the authoritative requirements source; these files organize design, execution, and ongoing notes.

## Documents

| File | Purpose |
|------|---------|
| [CURSOR_COVERITY_EXTENSION_PROMPT.md](./CURSOR_COVERITY_EXTENSION_PROMPT.md) | Original handoff / requirements (do not delete; reference for disputes) |
| [DESIGN.md](./DESIGN.md) | Architecture, data model, UI behavior, policies, module boundaries |
| [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) | Phased tasks with checkboxes and acceptance pointers |
| [PARSER_FORMAT.md](./PARSER_FORMAT.md) | Provisional report grammar, parser edit guide, fixture expectations |
| [DECISIONS_LOG.md](./DECISIONS_LOG.md) | Recorded design/implementation decisions (ADR-style) |
| [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | Unverified assumptions and user follow-ups |
| [NOTES.md](./NOTES.md) | Scratchpad for discoveries, meeting notes, and “new things” |
| [ACCEPTANCE.md](./ACCEPTANCE.md) | Manual test checklist and validation matrix |

## How to use these while building

1. **Before coding a area** — skim `DESIGN.md` and the relevant checklist section.
2. **When requirements change** — add a line to `NOTES.md`, update checklist/design if needed, and log a decision in `DECISIONS_LOG.md` when the choice is non-obvious.
3. **When the user supplies a real report or WSL command** — update `PARSER_FORMAT.md` / `OPEN_QUESTIONS.md`, add a decision entry, and tick verification items in the checklist.
4. **Before claiming “done”** — run through `ACCEPTANCE.md` and document what was actually tested.

## Status legend (checklists)

- `[ ]` Not started  
- `[~]` In progress  
- `[x]` Done  
- `[—]` Deferred / optional scope (explicitly out of current milestone)  
- `[?]` Blocked (note blocker in `OPEN_QUESTIONS.md` or checklist item)

## Verification labels

Use these consistently in docs and UI copy:

| Label | Meaning |
|-------|---------|
| **Verified** | Confirmed against real sample, API probe, or host test |
| **Assumed** | Implemented per brief; not yet validated on user data |
| **Deferred** | Optional or blocked; documented limitation |

## Related repo paths (planned)

Extension source lives under `anki.coverity-report-helper-0.1.0/src/` (see `DESIGN.md` module names).
