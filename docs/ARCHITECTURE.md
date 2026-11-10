# Architecture

## Direction
Use a unified control plane with isolated engine adapters. Do not merge the four legacy codebases.

Browser (mobile/desktop) -> BYGA AI Studio Web UI -> Studio API / Cloudflare Worker -> project/job/asset metadata and isolated adapters -> existing MCPNEW, HyperFrames, Remotion and Suara systems.

Heavy media rendering remains on existing GitHub Actions runners or each engine's rendering infrastructure.

## Responsibilities
Web UI: projects, assets, workflows and jobs; no provider secrets; calls only Studio API.

Studio API: authenticate/authorize, validate payloads, create normalized jobs, route to enabled adapters and normalize status/errors/output references.

Adapters: own provider-specific routes, auth, schemas and status mapping; fail independently; remain disabled until contracts are verified.

Legacy systems: remain authoritative for their own generation/rendering, standalone UI and deployments.

## Suggested monorepo layout
apps/web — React + TypeScript frontend  
apps/api — Cloudflare Worker / Hono API  
packages/contracts — shared validated schemas and types  
packages/adapters — isolated engine adapters  
packages/ui — shared design system  
packages/config — lint, TypeScript and test configuration  
docs — contracts, architecture, integration matrix and decisions

## Conceptual adapter interface
capabilities(): verified operations and limits  
healthCheck(): safe connectivity check  
submitJob(input, idempotencyKey): submit supported work  
getJob(jobId): normalized status and safe provider metadata  
getOutput(jobId): output references when available  
cancelJob(jobId): only if provider supports cancellation

Validate all method inputs/outputs. Preserve provider-specific fields as opaque metadata where useful.

## Job lifecycle
Normalized states: submitted, queued, running, succeeded, failed; cancelled only when supported. Do not assume every provider exposes progress. Persist provider job ID and correlation ID. Retry only when safe and account for duplicate work.

## Storage and persistence
R2 for media bytes after ownership/access/lifecycle are defined. KV for small/ephemeral/cache-like values, not a default relational job database. Consider D1 only when relational queries/transactions justify it and limits/cost are acceptable. Consider Durable Objects only for justified coordination/consistent state. Do not reuse or mutate legacy resources without approval. Mock/in-memory repository is acceptable for early UI development.

## Reliability
Per-adapter timeouts; bounded retry/backoff only for retry-safe operations; idempotency; graceful degradation; structured logs with correlation IDs; never log secrets, authorization headers or sensitive payloads.

## Security
Server-side secrets; least privilege; validate uploads by size, MIME and signature; restrict outbound hosts; authorize every project/job/asset access; rate-limit expensive generation endpoints; safe audit metadata.

## Deployment
Cloudflare Worker for suitable control-plane/API functions; GitHub Actions for CI and production deployment; production only, no preview/staging. Heavy rendering stays on authorized runners. No deployment to legacy repositories.

## Decisions pending evidence
Auth, persistence, canonical asset storage, callback/polling, upload limits, output retention, domain mapping and exact external API contracts.
