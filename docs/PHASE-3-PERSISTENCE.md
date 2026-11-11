# Phase 3 — Persistence decision (ADR): Cloudflare D1

**Status:** Store boundary and initial schema merged in PR #6. Database not provisioned; nothing deployed.

## Decision

Cloudflare D1 (SQLite) stores projects, asset metadata and jobs. The API talks to a `Store` interface (`apps/api/src/store.ts`) with two implementations:

- `D1Store` — used when the Worker has a `DB` binding.
- `MemoryStore` — used when there is no `DB` binding (local dev, unit tests, CI). Volatile, as in Phase 2.

`GET /api/v1/health` reports `persistence: "d1" | "memory"`.

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

## Not decided / not covered

- Retention, backup and restore policy (D1 Time Travel exists but no policy is set).
- Real asset bytes (still metadata-only; R2 is a separate decision).
- Multi-user data separation (single operator only).
- The web banner still says data is temporary in Worker memory; update it when the D1 binding is enabled in production.

## Provisioning (requires explicit approval; not performed)

1. Create the database: `npx wrangler d1 create byga-ai-studio-db`.
2. Add the binding to `apps/api/wrangler.jsonc` using the returned ID.
3. Apply migration: `npx wrangler d1 migrations apply byga-ai-studio-db --remote`.
4. Local runtime smoke: `npx wrangler d1 migrations apply byga-ai-studio-db --local`, then exercise API against local D1.

The binding is intentionally absent from `wrangler.jsonc`, so CI and Wrangler dry-run remain independent of Cloudflare resources.

## Tests

- `apps/api/test/d1-store.test.ts` applies migrations 0001 and 0002 to SQLite and exercises D1Store + HTTP API (CRUD, FK/CHECK, compare-and-swap, provider ID round-trip, SQL counts).
- `apps/api/src/app.store.test.ts` covers the memory path.
- SQLite shim is not a Cloudflare runtime. Run real Wrangler D1 local smoke before first production use.
