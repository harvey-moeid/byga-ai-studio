# Implementation Plan

Delivery is gated by phases. All changes stay in this repository. Production only; no preview/staging.

## Phase 0 — Discovery and API contract audit

Source-level inspection completed in the order MCPNEW → HyperFrames → Remotion → Suara. See PHASE-0-AUDIT.md, API-CONTRACT.md, INTEGRATION-MATRIX.md and RISK-REGISTER.md.

Remaining gates: runtime OAuth/MCP handshake; exact HyperFrames base URL; authorized non-mutating health checks; explicitly approved legacy test submits; output-access verification; licensing decision for Suara model weights and Remotion usage. No legacy dispatch, upload, cancel, write, secret change or deployment was performed.

## Phase 1 — Repository foundation

**Status:** merged to main in PR #3 after Phase 0 baseline. npm ci, secret scanning, lint, typecheck, tests, build and dev proxy smoke are in CI. See PHASE-1-FOUNDATION.md.

## Phase 2 — Core platform

**Status:** implemented on feat/phase-2-core-platform; final verification pending.

- Responsive dashboard, summary metrics, recent jobs and engine registry.
- Project create/list/rename/archive.
- Asset metadata register/list/remove with project association and validation; no binary upload.
- Normalized job center with a complete mock lifecycle.
- HyperFrames/Remotion mock adapters only; explicit blocked/unverified provider states.
- Mock mode is volatile and not production-safe.

**Exit gate:** CI passes and mock workflow/mobile acceptance is reviewed.

## Phase 3 — Engine adapters

Integrate one at a time only after verified contracts: Suara; HyperFrames; Remotion; MCPNEW. Document auth/schema, validate runtime I/O, add contract tests, timeouts/retry/idempotency/error mapping, prove output retrieval and preserve standalone operation.

## Phase 4 — Unified workflows

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
