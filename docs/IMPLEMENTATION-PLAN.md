# Implementation Plan

Delivery is gated by phases. All changes stay in this repository. Production only; no preview/staging.

## Phase 0 — Discovery and API contract audit

**Status:** source-level audit completed.

Source-level inspection completed in the order MCPNEW → HyperFrames → Remotion → Suara. See `PHASE-0-AUDIT.md`, `API-CONTRACT.md`, `INTEGRATION-MATRIX.md` and `RISK-REGISTER.md`.

Remaining gates: runtime OAuth/MCP handshake; exact HyperFrames base URL; authorized non-mutating health checks; explicitly approved legacy test submits; output-access verification; licensing decision for Suara model weights and Remotion usage. No legacy dispatch, upload, cancel, write, secret change or deployment is authorized by this audit.

## Phase 1 — Repository foundation

**Status:** merged to main in PR #3.

npm ci, secret scanning, lint, typecheck, tests, build and dev proxy smoke are in CI. See `PHASE-1-FOUNDATION.md`.

## Phase 2 — Core platform

**Status:** merged to main in PR #4.

- Responsive dashboard, summary metrics, recent jobs and engine registry.
- Project create/list/rename/archive.
- Asset metadata register/list/remove with project association and validation; no binary upload.
- Normalized job center with a complete mock lifecycle.
- HyperFrames/Remotion mock adapters only; explicit blocked/unverified provider states.
- Mock mode remains volatile when D1 is not bound.

## Phase 3 — Authentication, persistence and engine adapter foundations

**Status:** in progress. PRs #5–#11 are merged; remote production migrations are applied and verified; runtime/UX and deployment prerequisites remain open.

### 3.1 Authentication

- [x] Single-operator authentication and stateless session cookie foundation (PR #5).
- [x] Server-side token validation and fail-closed behavior when `STUDIO_ACCESS_TOKEN` is missing/too short.
- [ ] Configure the Worker secret through an approved secure path.
- [ ] Manual login/session UX review at 360 px and desktop.
- [ ] Confirm production auth behavior after an explicitly approved deployment.

### 3.2 Durable persistence

- [x] D1 Store boundary and schema (PR #6).
- [x] Additive migrations `0001_init.sql` and `0002_job_provider_id.sql`.
- [x] Production D1 database created and binding added (PR #10).
- [x] Manual remote migration workflow added (PR #10).
- [x] Local Wrangler D1 migration smoke and local build validation recorded.
- [x] Apply remote production migrations with explicit owner approval (workflow run #2, `42962819170`).
- [x] Verify remote `d1_migrations` and application tables independently; both migrations and expected app tables/indexes are present.

### 3.3 Remotion adapter foundation

- [x] Isolated client foundation, default-off feature flag, timeout, bounded read retry and fixture tests (PR #7).
- [x] Timeout/body-consumption fix (PR #8).
- [ ] Verify deployed runtime/base URL with an authorized non-mutating test.
- [ ] Add route integration only after auth, per-project authorization, quota/concurrency, output-access controls and runtime contract are proven.

### 3.4 Remaining provider foundations

- [ ] HyperFrames adapter after exact deployed base URL verification and explicit approval for any legacy mutation.
- [ ] MCPNEW MCP/OAuth client flow after explicit OAuth registration approval and runtime test.
- [ ] Suara remains blocked pending commercially compatible model/tokenizer rights.

### 3.5 Deployment workflow and prerequisites

- [x] Manual production deploy workflow added (PR #11).
- [x] Full quality gates and remote D1 migration preflight in deploy workflow.
- [ ] Verify GitHub `production` Environment reviewers and Cloudflare secret scopes.
- [ ] Configure Worker secret `STUDIO_ACCESS_TOKEN`.
- [x] Approve and complete remote migrations before deployment (completed 2026-11-11).
- [ ] Approve production deployment separately.
- [ ] Approve route/custom domain configuration separately; `workers_dev=false` and no route is currently declared.

## Phase 4 — Unified creation workflows

**Status:** in progress; first 4.1 creation slice implemented on `feat/phase-4-unified-workflows`. See `PHASE-4-CREATION-WORKFLOWS.md`.

- [x] Unified project-scoped audio/video creation launcher and standardized forms.
- [x] Video configuration saved as simulation jobs only; no unverified provider dispatch.
- [x] Suara TTS creation uses the existing server-side, opt-in provider adapter.
- [x] Existing audio preview/download and job status refresh surfaced from the creation flow.
- [x] Private R2 asset upload/storage and authenticated retrieval implemented.
- [ ] Unified progress/retry orchestration and verified video output management.
- [ ] Manual accessibility acceptance on desktop and 360px mobile.

## Phase 5 — Production hardening and launch

Threat model, security review, rate limiting, audit events, observability, runbook, reliability/load tests, retention/cost review, secret review and rollback plan. Owner approval required before deployment.

## Guardrails

- Feature work through branch and pull request; no direct main commits.
- No writes, dispatches, secret/config changes or deployments in legacy repos.
- No staging/preview deployments.
- Report inspected, changed, tested and unverified items separately.
- Never interpret a successful dry-run migration workflow as proof of remote schema application.

## Definition of done

Requirements trace to tests; CI green; contracts verified; security/licensing review complete for enabled features; outputs discoverable; mobile/desktop acceptance passes; production deployment explicitly approved.