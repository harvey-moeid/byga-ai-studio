# BYGA AI Studio

Unified workspace for AI-assisted audio and video production.

> Current status: Phase 2 — Core Platform (mock mode).  
> Deployment: production only; no preview/staging. Production release requires explicit owner approval.

## Product direction

BYGA AI Studio is the control plane for projects, assets, workflows and jobs across independent audio/video engines. It connects to MCPNEW, HyperFrames, Remotion and Suara through isolated adapters only after contracts, authentication, output access and licensing are verified. Legacy repositories remain independent.

## Stack

React, TypeScript, Vite, Hono on Cloudflare Workers, Zod, npm workspaces, Vitest and GitHub Actions.

## Phase 2 features

- Dashboard metrics, recent jobs and engine registry.
- Project create, rename and archive.
- Asset metadata register/list/remove (no binary upload).
- Normalized job center with queued → running → succeeded mock lifecycle.
- Mock adapters for HyperFrames and Remotion.
- Explicit disabled/unverified states for Suara and MCPNEW.
- Responsive desktop and mobile layouts.

## Mock-mode limits

Records live in process memory and can disappear on Worker restart or isolate changes. Asset records contain metadata only; no files are uploaded or stored. Job output is a mock:// reference, not generated media. No external provider is contacted, no credentials are configured, and engine cards do not report live provider health. Do not deploy this mock API as a production multi-user service.

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

Vite runs on port 5173 and proxies /api to Wrangler on 8787. npm run build validates the web build and Wrangler dry-run only; it does not deploy.

## Integration safety

- Provider adapters are not enabled; mock adapters never call external engines.
- No provider credentials in frontend or source control.
- No external render/audio submit, asset upload, cancellation or workflow dispatch.
- Studio API health is not provider health.
- No production domain, Cloudflare resource, secret or route is assumed.
- Do not modify MCPNEW, HyperFrames, Remotion or Suara repositories without separate approval.

## Documentation

- PRD.md
- docs/IMPLEMENTATION-PLAN.md
- docs/ARCHITECTURE.md
- docs/API-CONTRACT.md
- docs/PHASE-1-FOUNDATION.md
- docs/PHASE-2-CORE-PLATFORM.md

## License

Not yet selected. All rights reserved unless a license is added by the repository owner.
