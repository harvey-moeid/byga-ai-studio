# Implementation Plan

Delivery is gated by phases. All changes stay in this repository. Production only; no preview/staging.

## Phase 0 — Discovery and API contract audit

Source-level inspection completed in the order MCPNEW → HyperFrames → Remotion → Suara. See PHASE-0-AUDIT.md, API-CONTRACT.md, INTEGRATION-MATRIX.md and RISK-REGISTER.md.

Remaining gates: runtime OAuth/MCP handshake; exact HyperFrames base URL; authorized non-mutating health checks; explicitly approved legacy test submits; output-access verification; licensing decision for Suara model weights and Remotion usage. No legacy dispatch, upload, cancel, write, secret change or deployment was performed.

## Phase 1 — Repository foundation

**Status:** merged to main in PR #3. npm ci, secret scanning, lint, typecheck, tests, build and dev proxy smoke are in CI. See PHASE-1-FOUNDATION.md.

## Phase 2 — Core platform

**Status:** merged to main in PR #4.

- Responsive dashboard, summary metrics, recent jobs and engine registry.
- Project create/list/rename/archive.
- Asset metadata register/list/remove with project association and validation; no binary upload.
- Normalized job center with a complete mock lifecycle.
- HyperFrames/Remotion mock adapters only; explicit blocked/unverified provider states.
- Mock mode is volatile when D1 is not bound.

## Phase 3 — Authentication, persistence and engine adapter foundations

**Status:** authentication and D1 store are merged (PR #5 and #6). Remotion adapter foundation is in progress on its own branch; it is feature-flagged off and not wired to API routes.

- [x] Single-operator authentication and stateless session cookie.
- [x] D1 Store boundary, initial schema and SQLite-backed tests.
- [ ] D1 database provisioning, binding and remote migration (requires explicit production-resource approval).
- [ ] Wrangler D1 local-runtime smoke.
- [x] Remotion isolated client foundation, default-off feature flag, timeout, bounded read retry and fixture tests (pending CI verification in PR).
- [ ] Manual login review at 360 px and desktop.
- [ ] Remotion runtime contract and base URL verification (requires authorized, non-mutating test).
- [ ] HyperFrames adapter foundation after exact deployed URL verification.
- [ ] MCPNEW MCP/OAuth client flow after explicit OAuth registration approval.
- [ ] Suara remains blocked pending rights-compatible model/license decision.

## Phase 4 — Unified creation workflows

Project-based audio/video creation, supported options, secure asset selection/upload, progress/retry, output preview/download and accessibility review.

## Phase 5 — Production hardening and launch

Threat model, security review, rate limiting, audit events, observability, runbook, reliability/load tests, retention/cost review, secret review and rollback plan. Owner approval required before deployment.

## Guardrails

- Feature work through branch and pull request; no direct main commits.
- No writes, dispatches, secret/config changes or deployments in legacy repos.
- No staging/preview deployments.
- Report inspected, changed, tested and unverified items separately.

## Definition of done

Requirements trace to tests; CI green; contracts verified; security/licensing review complete for enabled features; outputs discoverable; mobile/desktop acceptance passes; production deployment explicitly approved.
