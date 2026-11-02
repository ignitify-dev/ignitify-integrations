# Claude Memory Snapshot (project)

> Re-synced 2026-10-12. The old SQLite-era snapshot was deleted; git keeps it.

**Source of truth** (Mitra memory, read first):
- Engineer: `artifacts/ignitify/engineer/memory/01-STATE-current.md` (traps: `02`, map: `03`).
- Architect: `artifacts/ignitify/architect/memory/01-SYSTEM-STATE.md` (decisions: `02`, traps: `03`).
- Designer: `artifacts/ignitify/designer/memory/01-DESIGN-STATE.md`.
- Orchestrator: `artifacts/ignitify/orchestrator/memory/01-PROGRAMME-STATE.md`.

**User-level index** (traps and standing rules): `~/.claude/projects/-Users-saeed-Projects-repos-mitra/memory/MEMORY.md`.

Rules that apply in this repo (details in the user-level index):
- Read the source; memory never beats `git grep`.
- Product name is **Ignitify** (units `ignitify-brain-1`/`-2`, user `ignitify`, `/opt/ignitify`). The old name survives only in the `scheduler:` config section and `core/scheduling/scheduler.ts`.
- Tests: hand over the command; run only changed test files; never chain with `&&`.
- Commit only when Saeed says so. Shipping to the fleet is Saeed's.
