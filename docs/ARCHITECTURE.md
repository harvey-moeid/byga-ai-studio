# Architecture

## Direction

Use a unified control plane with isolated engine adapters. Do not merge the four legacy codebases.

Browser (mobile/desktop) -> BYGA AI Studio Web UI -> Studio API / Cloudflare Worker -> project/job/asset metadata and isolated adapters -> existing MCPNEW, HyperFrames, Remotion and Suara systems.

Heavy media rendering remains on existing GitHub Actions runners or each engine's existing rendering infrastructure.

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

## Verified integration boundaries

### MCPNEW

MCPNEW is an MCP/OAuth service, not a render HTTP API. Its integration requires an MCP client, OAuth discovery/registration and an explicit user authorization flow. The Studio must not attempt to reuse ChatGPT connector credentials or expose GitHub access tokens in the browser. MCP tools include both read and write/destructive operations; apply action-level permissions and confirmation.

### HyperFrames

Use a server-side HTTP adapter for the verified Worker contract. `POST /render` can create a render from an existing composition. Supplying `html` commits a new composition to the legacy repository; `POST /asset` commits an asset. These mutation paths are disabled until separately approved. Status/output routes are public in the inspected source and must be wrapped by Studio project/job authorization.

### Remotion

Use a server-side HTTP adapter. The legacy submit route has no application authentication in the inspected handler, so the Studio must authenticate and authorize all requests itself, rate-limit submissions and never expose a raw open proxy. Provider status and output routes are public in the inspected source. Keep them behind Studio authorization when associated with a private project. Cancellation is supported for queued/rendering jobs.

### Suara

Use a server-side HTTP adapter. Never expose the shared `x-passcode` or internal `JOB_TOKEN` to the browser. The legacy API has a shared passcode rather than project/user-level authorization. Studio must enforce project/job access. No cancellation route or idempotency key was found. Do not retry a timed-out submit automatically. The current model weights are CC-BY-NC; commercial audio generation is blocked pending a rights-compatible model or explicit license.

## Normalized job lifecycle

Provider states observed:

- HyperFrames: `queued`, `done`, `failed`.
- Remotion: `queued`, `rendering`, `done`, `failed`, `cancelled`.
- Suara: `queued`, `running`, `done`, `failed`.

Normalize to `submitted`, `queued`, `running`, `succeeded`, `failed`; map `cancelled` only for providers that support it. Keep original provider state and timestamps. Do not invent progress for HyperFrames or Remotion. Suara exposes chunk progress.

No common idempotency contract was found. Generate a Studio job ID and persist the provider job ID before returning; do not blindly replay POST on timeout. A provider submit may have succeeded even when the caller timed out.

## Storage and persistence

R2 for Studio-owned media only after ownership/access/lifecycle are defined. KV for small/ephemeral/cache-like values, not a default relational job database. Consider D1 only when relational queries/transactions justify it and limits/cost are acceptable. Consider Durable Objects only for justified coordination/consistent state. Do not reuse or mutate legacy resources without approval.

Legacy output currently remains in each provider's own R2. Initially store only safe provider references/metadata in Studio; do not copy, move or delete legacy media without separate approval. Ensure private project access is enforced even when provider output URLs are public.

## Reliability

Per-adapter timeouts; bounded retry/backoff only for retry-safe operations; idempotency; graceful degradation; structured logs with correlation IDs; never log secrets, authorization headers or sensitive payloads. Disable automatic submit retries where the provider has no idempotency support.

## Security

Server-side secrets; least privilege; validate uploads by size, MIME and signature; restrict outbound hosts; authorize every project/job/asset access; rate-limit expensive generation endpoints; safe audit metadata. Treat public legacy endpoints as untrusted provider boundaries.

## Deployment

Cloudflare Worker for suitable control-plane/API functions; GitHub Actions for CI and production deployment; production only, no preview/staging. Heavy rendering stays on authorized runners. No deployment to legacy repositories.

## Decisions pending evidence

Studio authentication/user model, MCP OAuth client onboarding, HyperFrames base URL, live runtime contracts, persistence, canonical asset storage, callbacks/polling cadence, output retention, domain mapping, commercial model licensing and approved legacy runtime test scope.

## Phase 0 decisions

1. Keep all engine adapters disabled until the explicit approval gate in `docs/API-CONTRACT.md` is met.
2. No live submit/cancel/upload/dispatch tests against legacy services under the current no-touch scope.
3. Use MCP client/OAuth for MCPNEW; use isolated HTTP adapters for HyperFrames, Remotion and Suara.
4. Keep heavy rendering on existing authorized GitHub Actions runners.
5. Do not enable current Suara model weights for commercial workflows.
