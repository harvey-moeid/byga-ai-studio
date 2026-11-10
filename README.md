# BYGA AI Studio

Unified workspace for AI-assisted audio and video production.

> **Current status:** Phase 1 — repository foundation.  
> **Deployment policy:** Production only; no preview/staging deployment. Production release requires explicit owner approval.

## Product direction

BYGA AI Studio is the control plane for projects, assets, workflows and jobs across independent audio/video engines. It will connect to MCPNEW, HyperFrames, Remotion and Suara through isolated adapters only after their contracts, authentication, output access and licensing are verified.

The four legacy repositories remain independent and must not be modified by work in this repository.

## Stack

- Web: React, TypeScript, Vite
- API: Cloudflare Workers, Hono
- Contracts: Zod
- Tests: Vitest
- Workspace: npm workspaces
- CI: GitHub Actions

## Repository layout

\`\`\`text
apps/
  api/                 Hono Worker and Wrangler configuration
  web/                 React + Vite frontend
packages/
  contracts/           Shared Zod schemas and TypeScript types
docs/
  PHASE-1-FOUNDATION.md
  ...                  Product, architecture and integration audits
.github/workflows/
  ci.yml
\`\`\`

## Local development

Requirements: Node.js 22+ and npm 10+.

\`\`\`bash
npm install
npm run dev
npm run dev:api
\`\`\`

The frontend uses the same-origin \`/api/v1/health\` endpoint. Run quality checks with:

\`\`\`bash
npm run lint
npm run typecheck
npm test
npm run build
\`\`\`

\`npm run build\` builds the web app and runs a Wrangler dry run. It does not deploy.

## Integration safety

- Provider adapters are not enabled in Phase 1.
- No provider credentials are stored in frontend code.
- No external render/audio submit, asset upload, cancellation or workflow dispatch is performed.
- Studio health is not a proxy for legacy provider health.
- No production domain, Cloudflare account ID, resource ID or secret is guessed.
- Do not change MCPNEW, HyperFrames, Remotion or Suara repositories without separate approval.

## Documentation

- [Product requirements](PRD.md)
- [Phase 1 foundation](docs/PHASE-1-FOUNDATION.md)
- [Implementation plan](docs/IMPLEMENTATION-PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Integration matrix](docs/INTEGRATION-MATRIX.md)
- [API contract status](docs/API-CONTRACT.md)
- [Security policy](SECURITY.md)

## License

Not yet selected. All rights reserved unless a license is added by the repository owner.
