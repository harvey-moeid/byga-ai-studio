# BYGA AI Studio — Session Handoff

**Updated:** 2026-11-11  
**Repository:** `harvey-moeid/byga-ai-studio`  
**Default branch:** `main`  
**Default branch HEAD (observed at session start):** `829c0b6` (merge of PR #8)  
**Active branch:** `docs/handoff-d1-local-smoke` (docs-only, from `main`)  
**Open PR:** the PR carrying this file (number in GitHub; docs-only change)  
**Active phase/subphase:** Phase 3 — engine adapter foundations. Remotion adapter P2 is merged; D1 local runtime smoke is done.  
**Next immediate task:** manual login/session UX review at desktop and 360px (see section 8).

> On resume, fetch the live `main` tip, open PRs, PR comments/reviews and latest Actions. Live GitHub state is authoritative; this file can go stale (the earlier handoff once misreported PR #7 as open).

## 1. Repository audit snapshot

- Root: `PRD.md`, `HANDOFF.md`, `README.md`, `SECURITY.md`, `apps/`, `packages/`, `scripts/`, `.github/`, `docs/`.
- `PRD.md` v1.2.0 mandates one new studio repository, isolated adapters, production-only release, no legacy repo changes, server-side secrets, and explicit approval before production resource changes/deployment.
- PRs #1–#8 are merged.
- `apps/api/wrangler.jsonc` has **no** `d1_databases` binding; D1 is not provisioned or bound. Without a binding the API falls back to MemoryStore.

## 2. Delivery phases

### Completed / merged

- [x] Phase 0 — discovery, architecture, API contract audit (PR #1).
- [x] Phase 1 — monorepo foundation and CI baseline (PR #3).
- [x] Phase 2 — dashboard, project CRUD/archive, asset metadata, mock job lifecycle, engine registry, responsive shell (PR #4).
- [x] Phase 3: single-operator authentication (PR #5).
- [x] Phase 3: D1 Store boundary and initial schema (PR #6).
- [x] Phase 3: Remotion adapter foundation + provider job ID persistence (PR #7).
- [x] Phase 3: Remotion adapter P2 fix — timeout now covers response-body consumption; regression tests; GET-only bounded retry; submit/cancel single-attempt (PR #8, CI runs #42 and #43 green).
- [x] Phase 3: **D1 local Wrangler runtime smoke** (this session; see section 4).

### Remaining Phase 3 work

- [ ] Manual login/session UX review at 360px and desktop (not done; needs a browser).
- [ ] D1 provisioning, binding and remote migration — requires explicit approval; not done.
- [ ] Remotion runtime/base URL verification — not done. Live submit/cancel/output is mutating and needs separate explicit approval.
- [ ] Remotion route integration only after auth, per-project authorization, quota/concurrency, output-access controls and runtime contract are proven.
- [ ] HyperFrames adapter only after exact deployed base URL verification and approval for any GitHub/R2 mutations.
- [ ] MCPNEW MCP/OAuth client onboarding only after explicit OAuth registration and runtime-test approval.
- [ ] Suara remains blocked until commercially compatible model weights and tokenizer rights are confirmed.

### Later phases

- [ ] Phase 4 — unified creation workflows, secure asset selection/upload, progress and output preview/download.
- [ ] Phase 5 — security/reliability/accessibility/operations hardening and explicitly approved production launch.

## 3. Review findings

- P2 (Codex, PR #7, `discussion_r4533765432`): timeout ended before body parsing. Fixed in PR #8 and merged. Whether the review thread itself was marked resolved on GitHub was not verified (no tool to read review threads).
- No other known findings.

## 4. D1 local Wrangler runtime smoke — what was actually run

Run in the Claude container from a fresh clone of `main` at `829c0b6` (`npm ci`, Node v22.23.4, repo `wrangler` ^4). Nothing was changed in the repository and no Cloudflare resource was touched. Two throwaway configs lived in `/tmp` (not in the repo): a fake local-only D1 binding `DB` with a placeholder all-zero database id and `migrations_dir` pointing at `apps/api/migrations`; state persisted to `/tmp`.

Results (all observed output, local runtime only):

1. `wrangler d1 migrations apply DB --local` applied `0001_init.sql` and `0002_job_provider_id.sql` successfully, in order.
2. `wrangler dev --local` served the real worker (`apps/api/src/index.ts`) with the D1 binding. `GET /api/v1/health` returned `persistence: "d1"`.
3. Through the real routes (bearer auth with a throwaway 40-char token passed via `--var`): created a project, created a remotion job (`providerJobId: null`), advanced it queued→running→succeeded (mock output), a third advance returned `JOB_TERMINAL`, created an asset (metadata-only), dashboard counts matched (1 project / 1 asset / 1 job / 1 succeeded), archived the project.
4. After the dev server was stopped, `wrangler d1 execute --local` showed the rows persisted (1/1/1, project `archived=1`).
5. Migration 0002 objects exist: column `jobs.provider_job_id` and index `idx_jobs_provider_job_id`.
6. A direct insert with an invalid engine was rejected by the `CHECK` constraint.

Caveats — do not over-claim:

- This is the local Miniflare/workerd D1 emulation, not remote Cloudflare D1. It does not prove remote behavior, limits, latency, or that the remote migration will apply cleanly.
- Cookie/session login over HTTPS (`__Host-` Secure cookie) was not exercised; only bearer auth was used. CSRF path was not exercised here (covered by unit tests only).
- `updateProviderJobId` and the Remotion adapter are not reachable from any route, so provider ID persistence was verified only structurally (column/index exist; null round-trips), plus by existing SQLite-shim unit tests.
- Wrangler printed a harmless warning that `workers.cloudflare.com` could not be resolved (no network for `Request.cf`).
- Foreign-key enforcement was not specifically tested.

## 5. CI and verification status

- Latest CI observed: run #43 (PR #8 head `8c60b1b`) success; run #41 on `main` after PR #7 success. Per-step logs were not inspected; only run conclusions.
- A docs-only PR is expected to run CI again; check its result before merging.
- No deployment was performed. Dry-run build success is not a deployment and not production readiness.
- Not verified: browser/manual UI review; live Remotion calls; remote D1; the new regression test against the old code.

## 6. Architecture decisions and non-negotiable boundaries

- All new platform code belongs only in `harvey-moeid/byga-ai-studio`.
- Do not modify legacy repositories: `mcpnew`, `hyperframes`, `remotion`, `suara`; nor their branches, Actions, secrets, databases, buckets, KV namespaces, deployments or domains.
- No Cloudflare resources, bindings, secrets, database provisioning, remote migrations, workflows or deployments without separate explicit approval. (Adding a `d1_databases` entry to the repo's `wrangler.jsonc` is a binding change; it needs that approval too.)
- Production-only deployment policy; no preview/staging environment and no release without explicit approval.
- Keep adapters isolated, independently gated and disabled until contracts and security controls are verified.
- Never expose provider secrets or shared passcodes to browser code.
- Remotion legacy submit has no application auth in inspected source; status/output are public. Studio must enforce operator/project/job authorization and rate limits before routing.
- Legacy Remotion submit triggers GitHub workflow dispatch and writes legacy KV/R2 state; any live submit/cancel/upload/output needs separate explicit authorization.
- No provider idempotency key exists. Never automatically replay an ambiguous submit/cancel POST.
- Additive migrations only; never edit an applied migration. Keep 0001 unchanged.
- Assets remain metadata-only; job outputs remain mock references until authorized real integration.
- Single-operator auth is not multi-user isolation.
- Suara commercial generation remains blocked by licensing review.
- Distinguish source-inspected, fixture-tested, CI-tested, locally-runtime-verified, remote-verified and production-enabled claims.

## 7. Known risks / unresolved items

- D1 not provisioned or bound; no remote migration applied; local emulation is not remote proof.
- Remotion runtime URL and live behavior unverified; public submit/status/output routes and non-atomic quota require Studio-side controls.
- No project/user data separation beyond single operator.
- Retention, backup/restore, real media storage and upload limits open.
- HyperFrames deployed base URL unverified; MCPNEW OAuth untested; Suara licensing blocked.
- Manual accessibility/mobile/desktop acceptance incomplete.
- Optional doc follow-up: `docs/PHASE-3-REMOTION-FOUNDATION.md` was not re-read this session and may deserve a note that the timeout covers body consumption.

## 8. One exact next action

**Manual login/session UX review at desktop and 360px.** It needs a real browser; run `npm run dev` (web) with `npm run dev:api` locally, or have the owner review, and record findings here. Do not claim it done from unit tests or CI.

After that, in order: Remotion runtime contract verification (read-only unless separately approved), HyperFrames adapter, MCPNEW OAuth onboarding, Suara only after licensing is resolved. D1 provisioning/binding/remote migration happens only on explicit owner approval.
