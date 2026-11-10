# Phase 1 — Repository Foundation

**Status:** implementation baseline; CI verification pending GitHub Actions.

## Scope delivered

- npm workspaces for \`apps/web\`, \`apps/api\`, and \`packages/contracts\`.
- React + TypeScript + Vite web application shell.
- Hono API Worker with a versioned health endpoint and safe error envelope.
- Shared Zod schemas for project input, engine identifiers, normalized job states, health and API errors.
- Vitest unit tests for contracts and API behavior.
- ESLint flat configuration and strict TypeScript settings.
- GitHub Actions quality gates with least-privilege repository permissions and PR concurrency cancellation.
- Wrangler configuration for Worker Static Assets; no account IDs, routes, secrets, resource bindings or deployment targets are assumed.

## Architecture boundaries

The browser calls only the same-origin Studio API. Provider credentials and integration requests are not implemented in this phase. The API health endpoint reports only the Studio API process; it does not imply that MCPNEW, HyperFrames, Remotion or Suara are reachable.

The frontend labels all provider connections as not enabled. Suara remains blocked pending licensing resolution. No external provider submit, upload, cancel or workflow dispatch endpoint is called.

## Deployment guard

\`workers_dev\` is disabled. No production route or custom domain is configured because the production hostname and Cloudflare resource mapping have not been approved/verified. \`npm run build\` performs a Wrangler dry run only; it does not deploy.

## Local development

- \`npm install\`
- \`npm run dev\` — Vite frontend
- \`npm run dev:api\` — Wrangler API Worker
- \`npm run lint\`
- \`npm run typecheck\`
- \`npm test\`
- \`npm run build\`

## Acceptance / verification

- [ ] Clean install and dependency resolution.
- [ ] ESLint passes.
- [ ] TypeScript checks pass for web, API and shared contracts.
- [ ] Unit tests pass.
- [ ] Vite production build passes.
- [ ] Wrangler dry-run build passes with static assets.
- [ ] GitHub Actions CI passes on the PR head.
- [ ] No legacy repository or production resource is modified.

## Deferred to Phase 2

Persistent project CRUD, user authentication, asset storage, job persistence, job center, engine registry and operational dashboards. These require decisions and verified contracts; no mock success data is exposed as real state.
