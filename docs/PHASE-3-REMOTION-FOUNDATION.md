# Phase 3 — Remotion adapter foundation

**Status:** implemented as an isolated, fixture-tested client foundation. Feature flag defaults off. Not wired into API routes or production.

## Verified boundary

The source audit in `docs/API-CONTRACT.md` identifies the Remotion Worker routes:
- `GET /` health/info
- `POST /api/render` submit; returns `{ jobId }`
- `GET /api/jobs/:id` status
- `POST /api/jobs/:id/cancel` cancel

The audited source revision is `26a8198a0f85f92afdb45db690ee8c9529c87e06`. The configured URL in the source workflow is `https://remotion-api.harveymoeid.workers.dev`, but current deployed hostname, runtime response, and operational authorization have not been independently re-verified. No live request was made.

## Safety decisions

- Adapter package is isolated under `packages/adapters`; no provider call is wired into the Studio API.
- Constructor requires `enabled: true`; default is disabled and makes no network requests.
- Base URL must be supplied explicitly after runtime verification; no production URL is hard-coded.
- Read-only GET requests have a timeout and at most two retries (default one).
- Submit and cancel are single-attempt operations. The provider has no idempotency key; ambiguous POST timeouts must not be replayed automatically.
- Adapter tests use an injected fixture fetcher and a reserved `.invalid` hostname. They do not call the provider.
- Provider job ID is persisted separately in `jobs.provider_job_id` through additive migration `0002_job_provider_id.sql`.

## Not implemented / approval gates

- No API route invokes this adapter.
- No feature flag is exposed in production configuration.
- No credentials, secret, binding, legacy Worker, KV, R2, workflow, or deployment was changed.
- No live health check, render, cancellation or output retrieval was performed.
- Before enabling: verify current base URL and runtime contract; add server-side operator authorization and per-project access; define quota/concurrency and safe output access; obtain explicit approval for any legacy workflow dispatch and R2 write.

## Tests

`packages/adapters/src/remotion.test.ts` covers disabled-by-default, missing base URL, submit response parsing, no submit retry, bounded read retry, job ID validation and no cancellation retry. D1 store tests apply migrations 0001 and 0002 to SQLite and round-trip provider job IDs. CI is the authoritative execution environment for this branch.
