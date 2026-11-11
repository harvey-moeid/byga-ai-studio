# Phase 1 — Repository Foundation

**Status:** implementation delivered; review remediation (dev proxy) and secret scanning added; lockfile committed and CI uses `npm ci`. Final CI verification of the PR head is recorded in `HANDOFF.md`.

## Scope delivered

- npm workspaces for `apps/web`, `apps/api`, and `packages/contracts`.
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

`workers_dev` is disabled. No production route or custom domain is configured because the production hostname and Cloudflare resource mapping have not been approved/verified. `npm run build` performs a Wrangler dry run only; it does not deploy.

## Local development

- `npm ci` (reproducible install from the committed `package-lock.json`; use `npm install` only when changing dependencies, then commit the updated lockfile)
- `npm run build --workspace=@byga/web` once (Wrangler serves `apps/web/dist` as assets)
- `npm run dev:api` — Wrangler API Worker on `127.0.0.1:8787`
- `npm run dev` — Vite frontend on `5173`; proxies `/api` to Wrangler (override with `BYGA_API_ORIGIN`)
- `npm run smoke:dev` — starts both servers and verifies `/api/v1/health` through Vite
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Acceptance / verification

- [x] Lockfile-reproducible install (`package-lock.json` + `npm ci`) — verified locally and in CI run #20 on `58ba31d`: https://github.com/harvey-moeid/byga-ai-studio/actions/runs/42924941808
- [x] ESLint passes.
- [x] TypeScript checks pass for web, API and shared contracts.
- [x] Unit tests pass (6 tests).
- [x] Vite production build passes.
- [x] Wrangler dry-run build passes with static assets.
- [x] Vite `/api` proxy to Wrangler dev verified by `npm run smoke:dev`.
- [x] `npm audit --audit-level=high` reports 0 vulnerabilities.
- [ ] GitHub Actions CI passes on the PR head.
- [ ] No legacy repository or production resource is modified.

## Deferred to Phase 2

Persistent project CRUD, user authentication, asset storage, job persistence, job center, engine registry and operational dashboards. These require decisions and verified contracts; no mock success data is exposed as real state.
