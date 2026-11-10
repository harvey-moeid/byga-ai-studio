# BYGA AI Studio — PRD

Version 1.1.0 | Approved baseline for Phase 0 discovery  
Language: Indonesian-first | Deployment: Production only  
Repository visibility: Public temporarily by owner decision; may be changed to Private later.

## 1. Overview
BYGA AI Studio is a unified workspace for creating, orchestrating, monitoring and managing AI-assisted audio/video production. It connects four existing systems through isolated adapters, not by merging their codebases.

- MCPNEW: tool connectivity and orchestration.
- HyperFrames: HTML/CSS/GSAP video composition and rendering.
- Remotion: React-based video composition and rendering.
- Suara: audio, speech and voice generation.

## 2. Non-negotiable principles
- All new platform code belongs only in harvey-moeid/byga-ai-studio.
- Do not modify legacy repositories, branches, files, Actions, secrets, databases, buckets, KV namespaces, deployments or domains without separate explicit approval.
- Verify every API route, auth mechanism, schema, timeout, job lifecycle and output flow before implementing an adapter.
- Each adapter is isolated, independently health-checked and feature-flagged.
- Existing standalone apps remain usable if this studio is offline.
- Heavy rendering stays on GitHub Actions runners or existing engine infrastructure, not Worker CPU.
- Cloudflare-first where suitable; do not assume every service or capability is free.
- Secrets remain server-side and never enter browser bundles or source control.
- Production-only deployment. No preview/staging environment. No production release without explicit owner approval.

## 3. Goals
- One dashboard for projects, assets, jobs and engine health.
- Mobile-friendly audio/video creation workflows.
- Route work to the appropriate engine through stable adapters.
- Track job status, errors, logs and outputs.
- Make generated outputs discoverable in the originating project.
- Preserve standalone functionality of all four systems.

## 4. Non-goals
- Rewriting or merging the legacy codebases.
- Replacing legacy databases, buckets, auth or deployment pipelines.
- Rendering heavy media inside Workers.
- Building billing/multi-tenant SaaS before core workflows are proven.
- Automatically changing legacy infrastructure.

## 5. Users and primary journeys
Primary user: owner/operator creating audio and video content, often from mobile.

Journey: open dashboard; create/select project; upload/select assets; choose audio, HyperFrames or Remotion workflow; configure supported options; submit; track job; preview/download output; retry failures with actionable diagnostics.

## 6. Functional requirements
### Dashboard
Show project count, recent jobs, state distribution, engine health and actionable errors.

### Projects
Create, rename, archive and open projects. Associate jobs/assets with project IDs and enforce access boundaries.

### Audio Studio
Submit audio/voice generation through verified Suara API. Expose only confirmed options. Show progress and make generated audio discoverable.

### HyperFrames Studio
Submit composition/render requests through a verified contract. Support ratio, duration, dimensions and assets only where supported. Do not assume the Worker performs rendering.

### Remotion Studio
Submit React render jobs through a verified contract. Support templates/props/ratio only where confirmed.

### Asset library
Track project association, MIME, size, checksum, storage reference and metadata. Validate file type/size and secure preview/download.

### Job center
Normalize states: submitted, queued, running, succeeded, failed; cancelled only if provider supports it. Show engine, project, timestamps, error and output. Retry must account for idempotency.

### Engine settings and MCPNEW
Per-engine enabled/disabled and health state. Never reveal secrets. Integrate MCPNEW only for verified capabilities; core project/job state must not depend on MCPNEW availability.

## 7. Non-functional requirements
Security: server-side credentials, least privilege, validation, safe logging and rate limits. Reliability: bounded retries, timeouts, idempotency and graceful degradation. Performance: fast dashboard and asynchronous media processing. Accessibility: keyboard support and readable contrast. Mobile: usable from 360px width. Observability: structured logs and correlation IDs. Maintainability: typed contracts and isolated adapters.

## 8. Proposed stack
React + TypeScript + Vite frontend; pnpm workspace; Cloudflare Workers + Hono control-plane API; Zod or equivalent runtime validation. Choose KV/D1/R2 based on access patterns and cost; do not select D1 by default. Use R2 for media only after ownership, CORS and lifecycle are defined. Heavy jobs remain on existing authorized runners.

## 9. Conceptual data entities
Project: id, name, timestamps, settings.  
StudioJob: id, projectId, engine, operation, state, idempotencyKey, engineJobId, timestamps, error and output references.  
StudioAsset: id, projectId, type, MIME, size, checksum, storage reference and metadata.  
EngineConfig: engine key, enabled flag, non-secret endpoint metadata and health.  
AuditEvent: actor, action, target, timestamp and safe metadata.

These are conceptual models, not final schemas.

## 10. API principles
Version internal APIs (for example /api/v1). Validate inputs and outputs at adapter boundaries. Normalize job state without losing provider metadata. Keep provider-specific payloads inside adapters. Do not implement undocumented external routes. Use idempotency keys where supported and document duplicate risk otherwise.

## 11. Acceptance criteria
- Legacy repositories remain unchanged.
- Each adapter has contract tests based on verified schemas/fixtures.
- Adapter failure does not take down other engines or project browsing.
- No credentials in client bundles, commits or logs.
- Generated output is visible and linked to its project.
- Mobile and desktop layouts pass acceptance.
- CI passes lint, typecheck, tests and production build.
- Production workflow targets production only and requires explicit release authorization.
- Undocumented assumptions are marked pending verification.

## 12. Delivery phases
0 Discovery and contract verification.  
1 Repository foundation, tooling, design system, CI and security baseline.  
2 Core platform: dashboard, projects, assets, normalized job center and mock adapters.  
3 Engine adapters, one at a time after verification.  
4 Unified creation workflows and output visibility.  
5 Security, reliability, accessibility, operations and approved production launch.

## 13. Open decisions
Authentication/user model; exact API contracts/auth; webhook vs polling; canonical asset storage; persistence choice; upload/retention limits; model/voice/font licensing; production domain and Cloudflare resource mapping. Do not silently turn open decisions into assumptions.
