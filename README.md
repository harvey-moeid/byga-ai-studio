# BYGA AI Studio

Unified workspace for AI-assisted audio and video production.

> **Current status:** Phase 4 — unified creation workflows and private R2 assets are merged to `main`. The production Worker is deployed but has no public route yet. Phase 3 acceptance items remain open.
> **Deployment:** production only; no preview/staging. Any route/domain, secret, migration or release change requires explicit owner approval.

## Product direction

BYGA AI Studio is the control plane for projects, assets, workflows and jobs across independent audio/video engines. It connects to MCPNEW, HyperFrames, Remotion and Suara through isolated adapters only after contracts, authentication, output access and licensing are verified. Legacy repositories remain independent.

## Stack

React, TypeScript, Vite, Hono on Cloudflare Workers, Zod, npm workspaces, Vitest and GitHub Actions.

## Delivered baseline

- Responsive dashboard, project management and asset registry.
- Normalized job center and engine registry.
- Single-operator authentication/session foundation.
- D1 Store boundary, additive SQL migrations and SQLite-backed tests.
- Unified audio/video creation launcher (audio via Suara; video is simulation only).
- Private R2 asset upload, authenticated download and delete.
- Suara TTS adapter, opt-in and personal/non-commercial only.
- Isolated Remotion client foundation, default-off and not wired to production routes.
- Manual D1 migration workflow and manual production deploy workflow with quality gates and D1 preflight.

## Current production readiness

- Production D1 database, R2 bucket and Worker bindings exist; the Worker has been deployed.
- Migrations `0001_init.sql` and `0002_job_provider_id.sql` were applied by workflow run #2 (`42962819170`) and verified.
- The Worker is not publicly reachable until a route or custom domain is deployed. The owner-chosen domain is `aivideo.muidsoft.com`.
- Still open: production login/read-write/R2 acceptance, manual UX/accessibility acceptance, and verification of provider runtime contracts.
- No provider adapter is enabled for real external operations unless explicitly configured server-side.

## Mock-mode and integration limits

Records can still be volatile when D1 is not bound in the runtime. Project assets are uploaded to a private, project-scoped Cloudflare R2 bucket; downloads pass through the authenticated API. Video job outputs are simulated and are not generated media. Engine cards do not report live provider health unless the explicit health endpoint is called.

## Local development

Requirements: Node.js 22+ and npm 10+.

```bash
npm ci
npm run build --workspace=@byga/web
npm run dev:api
npm run dev
npm run smoke:dev
npm run check
```

Vite runs on port 5173 and proxies /api to Wrangler on 8787. `npm run build` validates the web build and Wrangler dry-run only; it does not deploy.

## Integration safety

- Provider adapters remain default-off until contracts and security controls are verified.
- No provider credentials in frontend or source control.
- No external render/audio submit, asset upload, cancellation or workflow dispatch without separate approval.
- Studio API health is not provider health.
- Route/domain, secret and deployment changes need explicit owner approval.
- Do not modify MCPNEW, HyperFrames, Remotion or Suara repositories without separate approval.

## R2 asset storage

- Dedicated APAC bucket: `byga-ai-studio-assets`; Worker binding: `R2_ASSETS`.
- Uploads are authenticated, project-scoped, MIME-allowlisted and limited to 25 MiB.
- D1 stores object keys; downloads are proxied through the authenticated API and the bucket is not public.

## Documentation

- PRD.md
- HANDOFF.md
- docs/IMPLEMENTATION-PLAN.md
- docs/ARCHITECTURE.md
- docs/API-CONTRACT.md
- docs/PHASE-1-FOUNDATION.md
- docs/PHASE-2-CORE-PLATFORM.md
- docs/PHASE-3-AUTH.md
- docs/PHASE-3-PERSISTENCE.md
- docs/PHASE-3-SUARA.md
- docs/PHASE-4-CREATION-WORKFLOWS.md
- docs/PHASE-4-R2-ASSETS.md

## License

Not yet selected. All rights reserved unless a license is added by the repository owner.
