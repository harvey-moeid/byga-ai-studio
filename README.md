# BYGA AI Studio

Unified workspace for AI-assisted audio and video production.

> **Current status:** Phase 3 — authentication, D1 persistence and adapter foundations. Production D1 binding and manual migration/deploy workflows are merged. Remote production migrations 0001 and 0002 have been applied and independently verified.
> **Deployment:** production only; no preview/staging. Production migration and release require explicit owner approval.

## Product direction

BYGA AI Studio is the control plane for projects, assets, workflows and jobs across independent audio/video engines. It connects to MCPNEW, HyperFrames, Remotion and Suara through isolated adapters only after contracts, authentication, output access and licensing are verified. Legacy repositories remain independent.

## Stack

React, TypeScript, Vite, Hono on Cloudflare Workers, Zod, npm workspaces, Vitest and GitHub Actions.

## Delivered baseline

- Responsive dashboard, project management and asset metadata registry.
- Normalized job center and engine registry with mock states.
- Single-operator authentication/session foundation.
- D1 Store boundary, additive SQL migrations and SQLite-backed tests.
- Isolated Remotion client foundation, default-off and not yet wired to production routes.
- Manual D1 migration workflow and manual production deploy workflow with quality gates and D1 preflight.

## Current production readiness

- Production D1 database and `DB` binding exist.
- Migrations `0001_init.sql` and `0002_job_provider_id.sql` were applied by workflow run #2 (`42962819170`), which completed successfully.
- Independent read-only SQL confirmed both rows in `d1_migrations` and the `projects`, `assets`, and `jobs` application tables.
- Do not deploy until remaining auth secret, UX, runtime, route/domain and explicit release approval gates are satisfied.
- `STUDIO_ACCESS_TOKEN` Worker secret, production route/custom domain and manual UX acceptance are separate outstanding prerequisites.
- No provider adapter is enabled for real external operations.

## Mock-mode and integration limits

Records can still be volatile when D1 is not bound in the runtime. Project assets are uploaded to a private, project-scoped Cloudflare R2 bucket; downloads pass through the authenticated API. Mock job outputs are not generated media. No external provider is contacted by mock adapters, and engine cards do not report live provider health.

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
- No production route/domain or secret is assumed configured.
- Do not modify MCPNEW, HyperFrames, Remotion or Suara repositories without separate approval.

## R2 asset storage

- Dedicated APAC bucket: `byga-ai-studio-assets`; Worker binding: `R2_ASSETS`.
- Uploads are authenticated, project-scoped, MIME-allowlisted and limited to 25 MiB.
- D1 stores object keys; downloads are proxied through the authenticated API and the bucket is not public.
- A separate `byga-ai-studio-staging` Worker/D1 environment is defined; production deployment and migration remain explicitly gated.

## Documentation

- PRD.md
- HANDOFF.md
- docs/IMPLEMENTATION-PLAN.md
- docs/ARCHITECTURE.md
- docs/API-CONTRACT.md
- docs/PHASE-1-FOUNDATION.md
- docs/PHASE-2-CORE-PLATFORM.md

## License

Not yet selected. All rights reserved unless a license is added by the repository owner.