# CONTEXT — workpool/QV240TY-create-agentsmd-least-code-principles

## What this branch is for
Create `AGENTS.md` at repo root encoding least-code, single-file, and layered principles adapted from technical-go, plus a one-liner in `README.md` referencing it.

## Origin
Ticket QV240TY (epiq, ref QV240TY, tags: minor, ready) — docs-only task in Photoscaler (Vite+React+TS). Boss handles epiq updates.

## Change map (diff → intent)
- `AGENTS.md` — new file, selective adaptation of technical-go frontend/structure/wording rules, no backend text
- `README.md` — append one-liner near Stack section referencing AGENTS.md

## Status
**Status:** In Progress
- [x] workpool claim + rebase
- [ ] create AGENTS.md with correct header and rule blocks
- [ ] patch README.md one-liner
- [ ] verify npm run build + npm run lint pass
- [ ] commit + hub store

## Review notes
Docs-only change. No Go/backend leakage. No em dashes in AGENTS.md itself. Verify build/lint still pass as regression check.
