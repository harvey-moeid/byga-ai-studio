# Implementation Plan

Delivery is gated by phases. All changes stay in this repository. Production only; no preview/staging.

## Phase 0 — Discovery and API contract audit

**Status:** source-level audit completed.

Source-level inspection completed in the order MCPNEW → HyperFrames → Remotion → Suara. See `PHASE-0-AUDIT.md`, `API-CONTRACT.md`, `INTEGRATION-MATRIX.md` and `RISK-REGISTER.md`.

Remaining gates: runtime OAuth/MCP handshake; exact HyperFrames base URL; authorized non-mutating health checks; explicitly approved legacy test submits; output-access verification; licensing decision for Remotion usage. No legacy dispatch, upload, cancel, write, secret change or deployment is authorized by this audit.

## Phase 1 — Repository foundation

**Status:** merged to main in PR #3.

npm ci, secret scanning, lint, typecheck, tests, build and dev proxy smoke are in CI. See `PHASE-1-FOUNDATION.md`.

## Phase 2 — Core platform

**Status:** merged to main in PR #4.

- Responsive dashboard, summary metrics, recent jobs and engine registry.
- Project create/list/rename/archive.
- Asset metadata register/list/remove with project association and validation.
- Normalized job center with a complete mock lifecycle.
- HyperFrames/Remotion mock adapters only; explicit blocked/unverified provider states.
- Mock mode remains volatile when D1 is not bound.

## Phase 3 — Authentication, persistence and engine adapter foundations

**Status:** code merged to main; runtime/UX acceptance and some provider verification remain open.

### 3.1 Authentication

- [x] Single-operator authentication and stateless session cookie foundation (PR #5).
- [x] Server-side token validation and fail-closed behavior when `STUDIO_ACCESS_TOKEN` is missing/too short.
- [x] Worker secret binding `STUDIO_ACCESS_TOKEN` present on the production Worker (observed 2026-11-11; value not readable).
- [ ] Manual login/session UX review at 360 px and desktop.
- [ ] Confirm production auth behavior on the production domain.

### 3.2 Durable persistence

- [x] D1 Store boundary and schema (PR #6).
- [x] Additive migrations `0001_init.sql` and `0002_job_provider_id.sql`.
- [x] Production D1 database created and binding added (PR #10).
- [x] Manual remote migration workflow added (PR #10).
- [x] Local Wrangler D1 migration smoke and local build validation recorded.
- [x] Apply remote production migrations with explicit owner approval (workflow run #2, `42962819170`).
- [x] Verify remote `d1_migrations` and application tables independently; both migrations and expected app tables/indexes are present.
- [ ] Confirm no later migration is pending, then verify deployed runtime read/write (`persistence: d1`).

### 3.3 Remotion adapter foundation

- [x] Isolated client foundation, default-off feature flag, timeout, bounded read retry and fixture tests (PR #7).
- [x] Timeout/body-consumption fix (PR #8).
- [ ] Verify deployed runtime/base URL with an authorized non-mutating test.
- [ ] Add route integration only after auth, per-project authorization, quota/concurrency, output-access controls and runtime contract are proven.

### 3.4 Remaining provider foundations

- [ ] HyperFrames adapter after exact deployed base URL verification and explicit approval for any legacy mutation.
- [ ] MCPNEW MCP/OAuth client flow after explicit OAuth registration approval and runtime test.
- [x] Suara adapter, API routes, audio proxy and UI panel merged (PR #15); opt-in, personal/non-commercial use only. Live health check and a real render are not yet verified.

### 3.5 Deployment workflow and prerequisites

- [x] Manual production deploy workflow added (PR #11).
- [x] Full quality gates and remote D1 migration preflight in deploy workflow.
- [x] Production Worker deployed (observed 2026-11-11 08:20 UTC); not publicly reachable without a route.
- [ ] Verify GitHub `production` Environment reviewers and Cloudflare token scope.
- [ ] Production domain: `aivideo.muidsoft.com` chosen by the owner; route declared in a separate PR and effective only after an owner-approved deploy.

## Phase 4 — Unified creation workflows

**Status:** 4.1 and 4.2 code merged to main (`5ec3616`); acceptance and orchestration remain open. See `PHASE-4-CREATION-WORKFLOWS.md`.

- [x] Unified project-scoped audio/video creation launcher and standardized forms.
- [x] Video configuration saved as simulation jobs only; no unverified provider dispatch.
- [x] Suara TTS creation uses the existing server-side, opt-in provider adapter.
- [x] Existing audio preview/download and job status refresh surfaced from the creation flow.
- [x] Private R2 asset upload/storage and authenticated retrieval implemented.
- [ ] Live R2 upload/download/delete acceptance on production.
- [ ] Unified progress/retry orchestration and verified video output management.
- [ ] Manual accessibility acceptance on desktop and 360px mobile.

## Phase 5 — Production hardening and launch

Threat model, security review, rate limiting, audit events, observability, runbook, reliability/load tests, retention/cost review, secret review and rollback plan. Owner approval required before any launch change.

## Guardrails

- Feature work through branch and pull request; no direct main commits.
- No writes, dispatches, secret/config changes or deployments in legacy repos.
- No staging/preview deployments.
- Report inspected, changed, tested and unverified items separately.
- Never interpret a successful dry-run migration workflow as proof of remote schema application.

## Definition of done

Requirements trace to tests; CI green; contracts verified; security/licensing review complete for enabled features; outputs discoverable; mobile/desktop acceptance passes; production deployment explicitly approved.
