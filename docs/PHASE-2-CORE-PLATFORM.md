# Phase 2 — Core Platform

**Status:** Implemented on feat/phase-2-core-platform; CI verification pending.

## Delivered

- Dashboard metrics, recent jobs and engine registry.
- Project create, list, rename and archive.
- Asset metadata registration, project association, listing and removal. No binary upload.
- Normalized mock jobs with queued → running → succeeded lifecycle.
- HyperFrames and Remotion mock adapters.
- Suara blocked pending licensing; MCPNEW inactive pending MCP/OAuth verification.
- Responsive desktop/mobile navigation and layouts.
- Shared Zod contracts and API tests.

## API

- GET /api/v1/dashboard
- GET|POST /api/v1/projects
- GET|PATCH|DELETE /api/v1/projects/:id (DELETE archives)
- GET|POST /api/v1/assets; DELETE /api/v1/assets/:id
- GET|POST /api/v1/jobs
- POST /api/v1/jobs/:id/advance (mock-only)
- GET /api/v1/engines
- GET /api/v1/health

Inputs are validated at API boundaries. Responses include request IDs and no-store headers.

## Boundaries

- Volatile in-memory maps only; no D1/KV/R2 bindings or migrations.
- No authentication/user model. This is a local single-operator prototype, not safe for public multi-user production.
- Asset records are metadata only; no file bytes accepted.
- Job outputs are mock:// references, not media files.
- No real provider calls, OAuth, credentials, webhooks, polling or external actions.
- Registry status is adapter mode, not live provider health.

## Acceptance

- [ ] Lint, typecheck, unit tests, build and dev proxy smoke pass.
- [ ] Project CRUD/archive and association tests pass.
- [ ] Asset metadata validation and size limit tests pass.
- [ ] Mock job lifecycle and disabled-engine tests pass.
- [ ] Manual mobile review at 360px and desktop.
- [ ] No legacy repository or production resource changed.
- [ ] No deployment performed.

## Deferred

Authentication, durable persistence, real uploads/R2, asset previews, real engine adapters, live health checks, provider retries/idempotency, webhooks/polling, output retrieval, user roles and production deployment.
