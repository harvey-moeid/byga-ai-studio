# Phase 3 — Persistence decision (ADR): Cloudflare D1

**Status:** code implemented on `feat/phase-3-d1-persistence`. **Database not provisioned; nothing deployed.** Resolves the "persistence choice" open decision.

## Decision

Cloudflare D1 (SQLite) stores projects, asset metadata and jobs. The API talks to a `Store` interface (`apps/api/src/store.ts`) with two implementations:

- `D1Store` — used when the Worker has a `DB` binding.
- `MemoryStore` — used when there is no `DB` binding (local dev, unit tests, CI). Volatile, as in Phase 2.

`GET /api/v1/health` reports `persistence: "d1" | "memory"` so an operator can see which one is live.

## Schema

`apps/api/migrations/0001_init.sql`: `projects`, `assets`, `jobs`, with foreign keys, CHECK constraints (name lengths, asset size ≤ 25 MiB, enum values) and indexes for the list queries. Additive migrations only; never edit an applied one. Job `input`/`output` are stored as JSON text; rows are re-validated through the shared Zod contracts on read.

## Behaviour notes

- Job advance uses compare-and-swap on `state`; a concurrent change returns `409 JOB_CONFLICT` instead of silently overwriting.
- List endpoints return at most 1000 rows (both stores). Pagination is not implemented yet.
- Job `input` is capped at 64 KiB (`400`).
- Archiving a project keeps its row; assets and jobs keep their foreign keys.
- `providerJobId` is not stored yet (always null). The adapter migration will add the column when a real provider needs it.

## Not decided / not covered

- Retention, backup and restore policy (D1 Time Travel exists but no policy is set).
- Real asset bytes (still metadata-only; R2 is a separate decision).
- Multi-user data separation (there is still a single operator).
- The web banner still says data is "sementara di memori Worker"; update it when the binding is enabled in production.

## Provisioning (requires explicit approval; not performed)

These steps change Cloudflare resources. Do not run them without approval.

1. Create the database: `npx wrangler d1 create byga-ai-studio-db`
2. Add the binding to `apps/api/wrangler.jsonc` using the returned id:

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "byga-ai-studio-db", "database_id": "<id from step 1>", "migrations_dir": "migrations" }
]
```

3. Apply the migration: `npx wrangler d1 migrations apply byga-ai-studio-db --remote`
4. Local dev against a local D1: `npx wrangler d1 migrations apply byga-ai-studio-db --local`, then `npm run dev:api`.

The binding is intentionally **not** in `wrangler.jsonc` yet, so CI and `wrangler deploy --dry-run` stay independent of any Cloudflare resource.

## Tests

- `apps/api/test/d1-store.test.ts` applies the real migration to SQLite (`node:sqlite`) and exercises `D1Store` plus the HTTP API end to end (CRUD, FK/CHECK enforcement, compare-and-swap, SQL counts). It sits outside `src/` because `apps/api` type-checks with workers-types only. It fails in CI if `node:sqlite` is unavailable and skips locally on Node versions without it.
- `apps/api/src/app.store.test.ts` covers the memory path (health persistence, input cap).
- This shim is not a Cloudflare runtime. Run a real `wrangler d1 ... --local` smoke before the first production use.
