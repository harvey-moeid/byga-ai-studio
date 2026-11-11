# Phase 3 — Persistence decision (ADR): Cloudflare D1

**Status:** Implemented and production schema applied. Store boundary and initial schema merged in PR #6; production D1 binding and manual migration workflow merged in PR #10. Owner-approved remote migrations 0001 and 0002 completed successfully in workflow run [#2](https://github.com/harvey-moeid/byga-ai-studio/actions/runs/42962819170) on 2026-11-11. Independent read-only SQL verification confirmed both migration records, application tables and expected indexes.

## Decision

Cloudflare D1 (SQLite) stores projects, asset metadata and jobs. The API talks to a `Store` interface (`apps/api/src/store.ts`) with two implementations:

- `D1Store` — selected when the Worker has a `DB` binding.
- `MemoryStore` — fallback when no `DB` binding is present (local dev, selected unit tests and CI). It is volatile and must not be mistaken for durable production persistence.

`GET /api/v1/health` reports `persistence: "d1" | "memory"`. Before relying on a running Worker, verify this endpoint reports `d1`; schema existence alone does not prove that the deployed Worker is bound to that database.

## Production resource and migration record

- Database: `byga-ai-studio`
- Database ID: `5b6d6aab-f2f4-4a4d-b6b5-db4b513f6c1e`
- Binding: `DB` in `apps/api/wrangler.jsonc`
- Migration directory: `apps/api/migrations`
- Applied: `0001_init.sql` and `0002_job_provider_id.sql`
- Workflow: manual `D1 migrations`, run ID `42962819170`; dispatched with `dry_run=false` after explicit owner authorization.
- Independent verification: `d1_migrations` contains both versions; `projects`, `assets`, `jobs` and their expected indexes exist.

This confirms remote schema readiness only. It does **not** confirm that a Worker has been deployed, that its binding is active at runtime, or that the application is publicly reachable.

## Schema

- `0001_init.sql`: projects, assets, jobs, foreign keys, CHECK constraints and indexes.
- `0002_job_provider_id.sql`: additive nullable `jobs.provider_job_id` plus lookup index for engine/provider job reconciliation. Existing rows remain valid.

Additive migrations only; never edit an applied migration. Job input/output are stored as JSON text; rows are re-validated through shared Zod contracts on read.

## Behaviour notes

- Job advance uses compare-and-swap on `state`; a concurrent change returns `409 JOB_CONFLICT`.
- List endpoints return at most 1000 rows; pagination is not implemented.
- Job input is capped at 64 KiB.
- Archiving a project keeps its row; assets and jobs keep their foreign keys.
- Provider job IDs are nullable until an adapter submits work; the Store can persist the returned ID without overwriting the Studio job state.
- Asset records are metadata-only; binary upload/storage is not implemented.

## Remaining decisions and risks

- Retention, backup and restore policy (D1 Time Travel exists but no policy is set).
- Real asset bytes (R2 is a separate future decision).
- Multi-user data separation (single operator only).
- The in-memory fallback remains available when `DB` is absent. Production runtime acceptance must explicitly check `/api/v1/health` reports `d1`; a missing binding must be treated as a release blocker.
- Runtime Worker deployment and public route/domain are not configured or verified by the migration workflow.

## Historical provisioning steps — completed

1. Create production database and record its returned ID.
2. Add binding `DB` and migration directory to `apps/api/wrangler.jsonc`.
3. Run the repository's manual `D1 migrations` workflow first in dry-run mode, then with `dry_run=false` after explicit approval.
4. Verify migration history and application schema using read-only remote queries.

## Tests

- `apps/api/test/d1-store.test.ts` applies migrations 0001 and 0002 to SQLite and exercises D1Store + HTTP API (CRUD, FK/CHECK, compare-and-swap, provider ID round-trip, SQL counts).
- `apps/api/src/app.store.test.ts` covers the memory path.
- SQLite shim is not a Cloudflare runtime. The tests do not prove production Worker binding or end-to-end deployed behavior.
