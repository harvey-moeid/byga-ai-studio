# Implementation Plan

Delivery is gated by phases. All changes stay in this repository. Production only; no preview/staging.

## Phase 0 — Discovery and API contract audit
Inspect actual routes, Worker handlers, workflow dispatch contracts, authentication, request/response schemas, job lifecycle, callbacks/polling, storage/output URLs, token scopes, limits, timeouts and licensing. Record repository commit, file path and line evidence. Deliver API contract register, integration matrix, architecture decisions and risk register.

Exit gate: no undocumented endpoint or payload is required by adapter design.

## Phase 1 — Repository foundation
Establish pnpm workspace and minimal monorepo layout; TypeScript, lint, formatting, test runner and schema validation; frontend shell and API Worker skeleton; shared types and errors; CI for install, lint, typecheck, unit tests, build, dependency checks and secret scanning.

Exit gate: clean CI; no production deployment.

## Phase 2 — Core platform
Responsive dashboard, project CRUD/access boundaries, asset metadata design, normalized job center, engine registry/health/feature flags and mock adapters.

Exit gate: complete mock workflow and mobile acceptance.

## Phase 3 — Engine adapters
Integrate one at a time, subject to verified contracts: Suara; HyperFrames; Remotion; MCPNEW where justified. For each: document auth/schema; validate runtime input/output; add unit and contract tests; add timeout/retry/idempotency/error mapping; prove output retrieval; verify standalone engine is unaffected.

Exit gate: adapter tests and explicit integration review pass.

## Phase 4 — Unified workflows
Project-based audio/video creation; supported template/voice/composition options; secure asset selection/upload; job progress/retry; output preview/download; mobile and accessibility review.

Exit gate: end-to-end tests for enabled engines with authorized test requests.

## Phase 5 — Production hardening and launch
Threat model, security review, rate limiting, audit events, observability, operational runbook, reliability/load tests, retention/cost review, production secret review, rollback plan.

Exit gate: owner approval before first production deployment.

## Guardrails
- Feature work through branch and pull request; no direct main commits.
- No writes, dispatches, secret/config changes or deployments in legacy repos.
- If integration requires legacy mutation, stop and request separate approval.
- No staging/preview deployments.
- Report inspected, changed, tested and unverified items separately.

## Definition of done
Requirements trace to tests; CI green; contracts verified; security/licensing review complete for enabled features; outputs discoverable; mobile/desktop acceptance passes; production deployment explicitly approved.
