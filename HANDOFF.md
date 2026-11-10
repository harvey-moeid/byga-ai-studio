# BYGA AI Studio — Session Handoff

**Verified:** 2026-11-11  
**Repository:** `harvey-moeid/byga-ai-studio`  
**Branch:** `feat/phase-1-foundation`  
**Active phase:** Phase 1 — Repository Foundation; dev proxy fixed and verified, lockfile committed and CI uses `npm ci`; only the Codex thread resolution and PR sequencing approval remain.  
**Next phase:** Phase 2 — Core Platform; not started.

> Point-in-time GitHub record. Re-check branch/PR/Actions before continuing. Green CI is not a merge or production-readiness signal.

## 1. GitHub state

### Branches
| Branch | SHA | Purpose |
|---|---|---|
| `main` | `86d93efce6237ee5678ce34b7244b4bdd5d1418d` | Bootstrap; unchanged |
| `docs/phase-0-foundation` | `5e9ddcb5cd39f6b32782d386429fc482e542ea7d` | Phase 0 audit |
| `feat/phase-1-foundation` | lockfile/CI commit `58ba31da8a3c80f82e95dd8f8e66fd26a458eb39` (verified); earlier code commit `839adaa`; then this HANDOFF-only refresh | Phase 1 |

Fetch branch HEAD for the exact current SHA; this file cannot contain the SHA of its own commit.

### Pull requests
| PR | Branch → base | State | Notes |
|---|---|---|---|
| [#1 Phase 0](https://github.com/harvey-moeid/byga-ai-studio/pull/1) | `docs/phase-0-foundation` → `main` | Open | No CI workflow/checks |
| [#2 Phase 1](https://github.com/harvey-moeid/byga-ai-studio/pull/2) | `feat/phase-1-foundation` → `docs/phase-0-foundation` | Open | Stacked on PR #1; neither merged |

Do not merge PR #2 before PR #1. After Phase 0 merges, retarget PR #2 to `main`, inspect its diff and rerun checks.

### CI / verification
Workflow: `.github/workflows/ci.yml`

- Run #17 (success) on code commit `839adaa...`: https://github.com/harvey-moeid/byga-ai-studio/actions/runs/42923308158 — every step succeeded: secret scanning (gitleaks), install, ESLint, typecheck, Vitest, build (Vite + Wrangler dry-run), dev proxy smoke test (Vite -> Wrangler), `npm audit --audit-level=high`.
- Run #18 (success) on handoff commit `2fa416f...`: https://github.com/harvey-moeid/byga-ai-studio/actions/runs/42924080025
- Run #19 (success) on handoff commit `97ef3cc`: https://github.com/harvey-moeid/byga-ai-studio/actions/runs/42924265095
- Run #20 (success) on `58ba31d` (lockfile + `npm ci`): https://github.com/harvey-moeid/byga-ai-studio/actions/runs/42924941808 — all 8 gates succeeded, with the install step now `npm ci --no-audit --no-fund`.
- Run #16 (success) covered the earlier handoff-only head `2080c89`.

This HANDOFF-only refresh is after `58ba31d`; check its own Actions run on resume (not verified at time of writing).

Local verification (sandbox, Node 22.23, npm 10.9, wrangler 4.160, workerd 2026-11-10; re-run this session from a clean `npm ci` against the committed lockfile): clean install, lint, typecheck, 6 unit tests, build, `npm audit` (0 vulnerabilities) and `npm run smoke:dev` all passed.

### Reviews
PR #2 has one Codex review (`COMMENTED`) with one P2 inline thread on `apps/web/src/App.tsx` line 18 (no `/api` proxy). **Fix is pushed and verified (local smoke + CI runs #17/#18), but the thread is NOT resolved** — the available tools cannot resolve review threads; resolve it manually on GitHub or reply with the evidence above. PR #1 has no review threads.

## 2. Phase and subphase status

### Phase 0 — Discovery and API contract audit
**Status:** source-level audit documented; runtime/approval gates remain open.

PR #1 changed files (8): `PRD.md`, `SECURITY.md`, `docs/API-CONTRACT.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/INTEGRATION-MATRIX.md`, `docs/PHASE-0-AUDIT.md`, `docs/RISK-REGISTER.md`.

Open gates:
- Runtime MCP/OAuth handshake and client/tool invocation.
- Exact HyperFrames public base URL.
- Authorized non-mutating runtime health checks where available.
- Explicitly approved legacy test submissions if required; verify output retrieval/access.
- Suara OmniVoice weights are CC-BY-NC: commercial enablement blocked pending rights-compatible model or permission.
- Verify Remotion integration security/authentication before enablement.

### Phase 1 — Repository Foundation
**Status:** foundation implemented; CI green on `839adaa` and `2fa416f`; lockfile/`npm ci` open.

**1.1 Workspace/app skeleton — done** (npm workspaces `apps/web`, `apps/api`, `packages/contracts`; React/Vite UI; Hono Worker `GET /api/v1/health`; shared Zod contracts).

**1.2 Quality gates — done and verified** (strict TS, ESLint, Vitest, CI, Vite build, Wrangler dry-run, npm audit high).

**1.3 Review remediation — fix done, thread unresolved**
- Vite `server.proxy['/api']` -> `http://127.0.0.1:8787` (override `BYGA_API_ORIGIN`).
- `apps/api` dev script pinned: `wrangler dev --ip 127.0.0.1 --port 8787`.
- Found and fixed a real dev-blocking bug: `compatibility_date` was `2026-11-11`, which the installed workerd (`2026-11-10`) rejects ("in the future and unsupported"), so `wrangler dev` could not start. Now `2026-11-10`. The earlier CI dry-run did not catch this.
- `npm run smoke:dev` (`scripts/smoke-dev.mjs`) starts both servers and asserts 200, JSON content type, `x-request-id`, `status: ok`, service, version, timestamp via the Vite port. Added to CI.
- Before the fix, the same request through Vite failed with 500 / ECONNREFUSED (observed).

**1.4 Reproducible install/security — done and verified**
- Secret scanning step (`gitleaks/gitleaks-action@v2`, `fetch-depth: 0`, `pull-requests: read`) passed in runs #17-#20.
- `package-lock.json` committed in `58ba31d` (333 resolved entries; all registry.npmjs.org except 3 workspace links; ~172 KB). Generated with `npm install`, then verified from a clean `node_modules` with `npm ci`, lint, typecheck, 6 unit tests, build, `npm audit --audit-level=high` (0 vulnerabilities) and `npm run smoke:dev`.
- CI install step switched to `npm ci --no-audit --no-fund`; README and `docs/PHASE-1-FOUNDATION.md` updated; CI run #20 green.

**1.5 PR integration — pending.** No merge.

### Phase 2 — Core Platform
**Status:** not started. No live provider adapters until Phase 3 after contracts/auth/licensing/output access are verified.

## 3. Files changed in this session

Commit `58ba31d`: `package-lock.json` (new), `.github/workflows/ci.yml` (`npm ci`), `README.md`, `docs/PHASE-1-FOUNDATION.md` (install instructions and acceptance checklist), `HANDOFF.md` (follow-up refresh).

Commit `839adaa`:

- `.github/workflows/ci.yml` (secret scanning, fetch-depth, smoke step)
- `apps/web/vite.config.ts` (proxy)
- `apps/api/package.json` (pinned dev port)
- `apps/api/wrangler.jsonc` (compatibility_date)
- `package.json` (`smoke:dev` script)
- `scripts/smoke-dev.mjs` (new)
- `README.md`, `docs/PHASE-1-FOUNDATION.md` (dev instructions, acceptance checklist updated to verified results, stray backslash-escaped backticks removed)
- `HANDOFF.md` (commits `2fa416f` and this refresh)

PR #2 otherwise unchanged from the earlier 28-file set.

## 4. Technical decisions and hard boundaries

Decisions:
- BYGA AI Studio is a control plane; legacy engine repositories remain independent.
- Web React + TypeScript + Vite; API Cloudflare Workers + Hono; contracts Zod; npm workspaces; Vitest; ESLint.
- R2 for Studio-owned assets only after approval/design; KV for ephemeral state; D1 only when justified.
- Studio API health is not provider health; provider cards stay disabled/unverified until adapters are tested.
- Production-only; no preview/staging. `workers_dev: false`; do not guess domains, account IDs, routes, bindings or resource IDs.
- Dev ports: Vite 5173, Wrangler 8787.

Non-negotiable:
- Do not modify MCPNEW, HyperFrames, Remotion or Suara.
- Do not dispatch legacy jobs, submit renders/audio, upload/cancel assets/jobs, write legacy DB/storage, change legacy secrets/config or deploy legacy services.
- Do not create/change Cloudflare resources, secrets, domains or production routes without explicit approval.
- **Do not deploy BYGA AI Studio.**
- No direct commits to `main`; branch + PR. Do not merge PR #1/#2 without separate authorization.
- Never present mock status as live provider health.

## 5. Known gaps / errors
1. Codex P2 thread on `App.tsx` still unresolved on GitHub (fix verified).
2. `wrangler dev` in the sandbox logs `getaddrinfo ENOTFOUND workers.cloudflare.com` (cannot fetch `Request.cf`; falls back to placeholder). Sandbox network limitation, harmless.
3. `compatibility_date` must not exceed the installed workerd release date; revisit when upgrading wrangler.
4. `eslint@9.39.5` prints an npm deprecation warning; no action taken yet.
5. gitleaks-action may require a license for organization-owned repos; fine for a personal account. Revisit if the repo moves to an org.
6. Phase 0 runtime/auth/URL/output/licensing gates remain open.
7. Authentication, persistence, asset storage, job persistence, adapters and deployment are not implemented by design.

## 6. Single recommended next action

Resolve the Codex P2 thread on PR #2 (`apps/web/src/App.tsx` line 18) on GitHub, or reply with the evidence (smoke:dev in CI runs #17-#20), then give separate approval for the PR sequence: merge PR #1 (Phase 0 -> `main`), retarget PR #2 to `main`, inspect the diff, rerun CI, then merge PR #2. Do not begin Phase 2 before that. Do not deploy.

## 7. Resume checklist
- [ ] Re-read this file; verify branch/PR/CI state and head SHAs.
- [x] Fix and verify Vite-to-Worker proxy (local smoke + CI runs #17/#18).
- [x] Add secret scanning (CI runs #17/#18).
- [x] Update stale Phase 1 acceptance docs.
- [x] Add lockfile and switch to `npm ci` (commit `58ba31d`, CI run #20).
- [ ] Resolve Codex P2 thread on GitHub.
- [ ] Re-check Phase 0 runtime/licensing gates.
- [ ] Obtain approval before any merge or deployment.

**End-of-session:** lockfile/CI commit `58ba31d` green in run #20 (earlier: `839adaa` run #17, `2fa416f` run #18, `97ef3cc` run #19). PR #1 and #2 open; neither merged. No deployment, no Cloudflare resource changes, no legacy repository touched.
