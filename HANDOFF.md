# BYGA AI Studio — Session Handoff

**Updated:** 2026-11-11 (end of session)  
**Repository:** `harvey-moeid/byga-ai-studio`  
**Default branch:** `main`, HEAD observed `c9dcd1e` (merge of PR #9). CI on `main`: run #46 success.  
**Active branch (this file lives here until PR #10 merges):** `feat/d1-binding-and-migration-workflow`  
**Open PRs:** #10 (this branch) and #11 (`feat/manual-production-deploy-workflow`, head `544744b4c936d462fb78ed07d4be39d39e90bf95`). Both OPEN, not merged.  
**Active phase/subphase:** Phase 3 — engine adapter foundations and persistence. Remotion adapter foundation and its P2 fix are merged; production D1 exists; binding + manual migration workflow (#10) and manual deploy workflow (#11) await owner review/merge.  
**Next immediate task:** see section 9.

> The live GitHub state is authoritative. If PR #10 is not merged, `main` still carries the previous (older) HANDOFF.md; read this version from branch `feat/d1-binding-and-migration-workflow`.

## 1. Repository snapshot (verified from GitHub this session)

- Root: `PRD.md`, `HANDOFF.md`, `README.md`, `SECURITY.md`, `apps/`, `packages/`, `scripts/`, `.github/`, `docs/`. Migrations: `apps/api/migrations/0001_init.sql`, `0002_job_provider_id.sql`.
- On `main`: workflow `.github/workflows/ci.yml` only. `apps/api/wrangler.jsonc` has **no** D1 binding on `main`.
- Open issues: none.
- Branches known to this session: `main`, `feat/d1-binding-and-migration-workflow`, `feat/manual-production-deploy-workflow`, plus merged historical branches (`docs/phase-0-foundation`, `feat/phase-1-foundation`, `feat/phase-2-core-platform`, `feat/phase-3-auth`, `feat/phase-3-d1-persistence`, `feat/phase-3-remotion-adapter-foundation`, `fix/remotion-adapter-body-timeout`, `docs/handoff-d1-local-smoke`). A full branch list was not re-fetched at the end of the session.

## 2. Pull requests

| PR | State | Branch | Head / merge SHA | Content |
|---|---|---|---|---|
| #7 | merged | `feat/phase-3-remotion-adapter-foundation` | merge `610de17` | Remotion adapter foundation, migration 0002, provider job ID persistence |
| #8 | merged | `fix/remotion-adapter-body-timeout` | code `bb26437`, handoff `8c60b1b`, merge `829c0b6` | P2 fix: timeout covers response body; regression tests |
| #9 | merged | `docs/handoff-d1-local-smoke` | head `e3b809c`, merge `c9dcd1e` | D1 local Wrangler smoke recorded in HANDOFF (docs only) |
| #10 | **open** | `feat/d1-binding-and-migration-workflow` | binding+workflow `2ddb630`, earlier handoff `985988d`, plus this handoff commit | `apps/api/wrangler.jsonc` D1 binding, `.github/workflows/migrate-d1.yml`, `HANDOFF.md` |
| #11 | **open** | `feat/manual-production-deploy-workflow` | `544744b4c936d462fb78ed07d4be39d39e90bf95` | `.github/workflows/deploy-production.yml` (single file) |

PRs #1–#6 were merged in earlier sessions.

## 3. Delivery phases

### Completed / merged

- [x] Phase 0 (PR #1); Phase 1 (#3); Phase 2 (#4); Phase 3 auth (#5); D1 Store boundary + schema (#6); Remotion adapter foundation (#7); Remotion P2 timeout fix (#8); D1 local runtime smoke record (#9).

### Done outside the repo this session (owner-approved)

- [x] **Production D1 database created** via the byga.ai tool: name `byga-ai-studio`, UUID `5b6d6aab-f2f4-4a4d-b6b5-db4b513f6c1e`, location hint APAC, created 2026-11-11T04:40:30Z. Verified afterwards: only Cloudflare's internal `_cf_KV` table present; **no migration applied**.

### In review (not merged, not run)

- [x] PR #10: D1 binding `DB` → `byga-ai-studio` with `migrations_dir: "migrations"`; manual workflow `D1 migrations` (`workflow_dispatch` only, `dry_run` default true, `main` only, Environment `production`, `permissions: contents: read`, no cancel-in-progress; steps checkout, Node 22, `npm ci`, `wrangler d1 migrations list DB --remote`, and when `dry_run=false` apply then list again).
- [x] PR #11: manual workflow `Deploy production` (`workflow_dispatch` only, `main` only, input `confirm` must equal `DEPLOY`, Environment `production`, runs `npm run check`, preflight requires "No migrations to apply" from `wrangler d1 migrations list DB --remote`, then `npx wrangler deploy` in `apps/api`).
- [ ] Owner merge decisions for #10 and #11. Merge #10 before #11 (the preflight needs the `DB` binding).

### Not done

- [ ] Remote D1 migrations (0001, 0002) — never run. Remote D1 has no application tables.
- [ ] Any deployment of the Studio Worker — never run. No Worker named `byga-ai-studio` existed in the account when checked (read-only list), so a first deploy creates a new Worker rather than overwriting one.
- [ ] Worker secret `STUDIO_ACCESS_TOKEN` — not set by this session; without it the API fails closed (503 `AUTH_NOT_CONFIGURED`).
- [ ] Route / custom domain — none defined; `wrangler.jsonc` has `workers_dev: false`, so a deployed Worker is not publicly reachable until a separately approved route or domain is added.
- [ ] Manual login/session UX review at 360px and desktop (needs a browser).
- [ ] Remotion runtime/base URL verification and any live call (mutating calls need separate explicit approval).
- [ ] Remotion route integration (only after auth, per-project authorization, quota/concurrency, output-access controls and runtime contract are proven).
- [ ] HyperFrames adapter (after exact deployed base URL verification and approval for GitHub/R2 mutations).
- [ ] MCPNEW MCP/OAuth onboarding (after explicit OAuth registration and runtime-test approval).
- [ ] Suara — blocked until commercially compatible model weights and tokenizer rights are confirmed.
- [ ] Phase 4 (unified creation workflows, secure upload, previews) and Phase 5 (hardening, approved launch).

## 4. Files changed this session (in GitHub)

Merged to `main`:
- `apps/api/src/adapters/remotion.ts` — `request<T>()` owns fetch + error-body read + caller `consume` step; timer cleared only in `finally` after `return await consume(response)`; GET-only bounded retry for transient errors; submit/cancel single-attempt; helpers `discardBody`, `isRetryableReadError`.
- `apps/api/src/adapters/remotion.test.ts` — six original tests kept; five regression tests added (stalled body on submit, on getJob with `readRetries: 0`, bounded retry of stalled getJob = 2 calls, stalled error-response body, timer count 0 after success/failure).
- `HANDOFF.md` — updated in #8 and #9.

In open PR #10: `apps/api/wrangler.jsonc`, `.github/workflows/migrate-d1.yml`, `HANDOFF.md`.
In open PR #11: `.github/workflows/deploy-production.yml`.

No other files were touched. No legacy repository was modified.

## 5. Verification results

GitHub Actions (CI / `ci.yml`: gitleaks, `npm ci`, ESLint, typecheck, unit tests, `wrangler deploy --dry-run` build, Vite→Wrangler dev proxy smoke, `npm audit --audit-level=high`). Only run **conclusions** were read this session, not per-step logs:

- #42 `bb26437` (PR #8 code) success; #43 `8c60b1b` (PR #8 handoff) success; #44 on `main` success; #45 `e3b809c` (PR #9) success; #46 on `main` after PR #9 success.
- #47 `985988d` (PR #10 head before this handoff commit) success.
- #48 `544744b` (PR #11 head) success.
- The CI run for the final PR #10 head (this handoff commit) must be read from GitHub before merging; this file does not claim it.

Local, in the Claude container (Node v22.23.4, `npm ci` from a clone of `main`; local emulation only, throwaway state in `/tmp`, repo untouched):

- `wrangler d1 migrations apply --local` applied 0001 and 0002.
- `wrangler dev --local` served the real worker with a local D1 binding; `/api/v1/health` returned `persistence: d1`; project, job (queued→running→succeeded, then `JOB_TERMINAL`), asset and dashboard counts behaved as expected via bearer auth; data persisted after the server stopped; `jobs.provider_job_id` column and `idx_jobs_provider_job_id` exist; invalid engine insert rejected by the CHECK constraint.
- With the PR #10 `wrangler.jsonc`, `migrations list/apply --local` worked and `wrangler deploy --dry-run` listed `env.DB (byga-ai-studio)` and `env.ASSETS`.
- `migrate-d1.yml` and `deploy-production.yml` parse as valid YAML. The string `No migrations to apply` was confirmed from local wrangler output.

Not verified / not run:

- Neither new workflow has ever been executed on GitHub.
- Existence/protection of the GitHub Environment `production` (required reviewers) and of secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`: the owner said they were set up; this session could not check. If the environment is missing GitHub creates it without reviewers.
- API token scope for D1 migrations and Worker deploy.
- Remote D1 behavior; cookie/HTTPS login and CSRF paths against D1 (bearer only in the smoke); foreign-key enforcement; browser/manual UI.
- The new Remotion regression tests were never run against the old implementation (their failing-before-fix property is reasoned, not demonstrated).
- Review comments on PRs #10/#11 and the resolution state of the PR #7 review thread (`discussion_r4533765432`) — no tool to read them.

Unresolved errors: none known. A harmless wrangler local warning (cannot resolve `workers.cloudflare.com` for `Request.cf`) appeared in the sandbox.

## 6. Technical decisions and boundaries (do not violate)

- Remote D1 migrations are applied **only** through the manually dispatched `D1 migrations` GitHub Action (owner decision). No ad-hoc remote schema changes by other means.
- **Order:** migrate remote D1 first, deploy second. Once a deployment includes the `DB` binding, `getStore` switches from MemoryStore to D1Store; without tables the API fails. The deploy workflow enforces this with its preflight.
- Additive migrations only; never edit an applied migration; keep 0001 unchanged.
- No deployment, workflow dispatch, secret change, route/domain or new Cloudflare resource without explicit owner approval each time. (The D1 database above was created under such approval.)
- All new platform code only in `harvey-moeid/byga-ai-studio`. Do not modify `mcpnew`, `hyperframes`, `remotion`, `suara` (repos, branches, Actions, secrets, databases, buckets, KV, deployments, domains). Legacy account resources observed by name include D1 `mcpnew` and Workers `hyperframes-render` and `remotion-api`; do not touch them.
- Use branches and PRs; never commit to `main` directly; never merge without the owner's decision.
- Adapters stay isolated and default-off until contracts and security controls are verified; the Remotion adapter is not wired into any route.
- Never expose provider secrets or shared passcodes to browser code.
- Remotion legacy submit has no application auth, status/output are public, submit triggers GitHub workflow dispatch and writes legacy KV/R2; Studio must enforce operator/project/job authorization and rate limits first.
- No provider idempotency key: never auto-replay an ambiguous submit/cancel POST.
- Assets are metadata-only; job outputs are mock references until authorized real integration. Single-operator auth is not multi-user isolation. Suara stays blocked by licensing.
- Distinguish source-inspected, fixture-tested, CI-tested, locally-runtime-verified, remote-verified and production-enabled claims. Never claim success without verification.

## 7. Known risks

- Remote D1 empty until the migration workflow runs; deploying earlier would break the API (deploy preflight guards the workflow path only).
- `production` environment without required reviewers would let dispatches run unapproved.
- Deployed Worker unreachable until route/domain decided; API unusable until `STUDIO_ACCESS_TOKEN` secret set.
- No data separation beyond a single operator; retention, backup/restore, real media storage and upload limits open.
- Remotion public routes and non-atomic quota need Studio-side controls; HyperFrames base URL unverified; MCPNEW OAuth untested.
- Manual accessibility/mobile/desktop acceptance incomplete.
- Process lesson: an earlier handoff misreported PR #7 as open. Always re-verify PR/branch state on GitHub first.

## 8. Session scope statement

No remote migration, no workflow dispatch, no deployment, no secret changes, no live Remotion/HyperFrames/MCPNEW calls, no changes to legacy repositories or other D1 databases/Workers.

## 9. One exact next action

**Owner: confirm that the GitHub Environment `production` has required reviewers, then review and merge PR #10** (CI on its final head must be green).

Then, in order: merge PR #11; dispatch `D1 migrations` with `dry_run=true` and confirm 0001 and 0002 are pending; dispatch with `dry_run=false`; verify the tables with a read-only query; set `STUDIO_ACCESS_TOKEN` and decide the route/domain (separate approved changes); only then dispatch `Deploy production`. Afterwards: manual login review (desktop and 360px), Remotion runtime contract verification (read-only unless separately approved), HyperFrames adapter, MCPNEW onboarding, Suara after licensing.
