# BYGA AI Studio — Session Handoff

**Updated:** 2026-11-11  
**Repository:** `harvey-moeid/byga-ai-studio`  
**Default branch:** `main`, HEAD at session start of this change: `c9dcd1e` (merge of PR #9)  
**Active branch:** `feat/d1-binding-and-migration-workflow` (from `main`)  
**Open PR:** the PR carrying this file (binding + migration workflow + handoff)  
**Active phase/subphase:** Phase 3 — D1 provisioning is done; binding and manual migration workflow are in review.  
**Next immediate task:** owner merges the PR, then manually dispatches `D1 migrations` with `dry_run=true`, then `dry_run=false` (section 8).

> On resume, fetch live `main`, open PRs, PR comments/reviews and latest Actions. Live GitHub state is authoritative.

## 1. Repository snapshot

- Root: `PRD.md`, `HANDOFF.md`, `README.md`, `SECURITY.md`, `apps/`, `packages/`, `scripts/`, `.github/`, `docs/`.
- Workflows: `.github/workflows/ci.yml` (PR/push/manual) and, added by this change, `.github/workflows/migrate-d1.yml` (manual only).
- There is **no deploy workflow** in the repo. How/when the Worker is deployed is not defined here; do not assume.
- PRs #1–#9 merged.

## 2. Delivery phases

### Completed / merged

- [x] Phases 0–2 (PRs #1, #3, #4); Phase 3 auth (#5); D1 Store boundary + schema (#6); Remotion adapter foundation (#7); Remotion adapter P2 timeout fix (#8); D1 local Wrangler smoke + handoff (#9).
- [x] **Production D1 database created** (this session, owner-approved via byga.ai tool): name `byga-ai-studio`, UUID `5b6d6aab-f2f4-4a4d-b6b5-db4b513f6c1e`, location hint APAC, created 2026-11-11T04:40:30Z. At creation it held only Cloudflare's internal `_cf_KV` table; no migration applied.

### In review (this PR)

- [x] `apps/api/wrangler.jsonc`: `d1_databases` binding `DB` → `byga-ai-studio` (UUID above), `migrations_dir: "migrations"`.
- [x] `.github/workflows/migrate-d1.yml`: `workflow_dispatch` only; `dry_run` input defaults to true; runs only on `refs/heads/main`; uses GitHub Environment `production`; permissions `contents: read`; concurrency group, no cancel-in-progress; steps: checkout, Node 22, `npm ci`, `wrangler d1 migrations list DB --remote`, and (only when `dry_run=false`) `migrations apply DB --remote` then list again. Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are read from the environment/repo secrets and never echoed.
- [ ] Merge decision by owner.

### Remaining Phase 3 work

- [ ] Run the migration workflow (dry run first, then apply) — not run.
- [ ] Manual login/session UX review at 360px and desktop (needs a browser) — not done.
- [ ] Remotion runtime/base URL verification — not done; live mutating calls need separate explicit approval.
- [ ] Remotion route integration only after auth, per-project authorization, quota/concurrency, output-access controls and runtime contract are proven.
- [ ] HyperFrames adapter after exact deployed base URL verification and approval for any GitHub/R2 mutations.
- [ ] MCPNEW MCP/OAuth onboarding after explicit OAuth registration and runtime-test approval.
- [ ] Suara blocked until commercially compatible model weights and tokenizer rights are confirmed.

### Later phases

- [ ] Phase 4 — unified creation workflows, secure asset selection/upload, progress and output preview/download.
- [ ] Phase 5 — hardening and explicitly approved production launch.

## 3. Verification actually performed for this change

In the Claude container, from a clone of `main` with the new `wrangler.jsonc` applied temporarily (reverted, then the same content pushed via GitHub):

- `wrangler d1 migrations list DB --local` and `migrations apply DB --local` with the repo config succeeded for 0001 and 0002 (local emulation only, throwaway state in `/tmp`).
- `npm run build` (`wrangler deploy --dry-run`) succeeded and listed `env.DB (byga-ai-studio) D1 Database` and `env.ASSETS`. A dry run is not a deployment.
- `migrate-d1.yml` parsed as valid YAML locally. It has **not** been executed on GitHub.
- CI results for the PR head must be read from GitHub Actions before merge; this file does not claim them.

Not verified:

- That repo secrets `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` and the `production` environment (with required reviewers) exist. The owner said they were set up; this session had no way to confirm it. If the environment does not exist, GitHub auto-creates it without reviewers — check the protection rules before the first dispatch.
- That the API token's scope allows `d1 migrations` on this database.
- Any remote D1 behavior. No migration has been applied remotely.

## 4. Review findings

- P2 (Codex, PR #7) fixed in PR #8 and merged; GitHub thread resolution not verified.
- No other known findings. Comments on the current PR were not read.

## 5. Architecture decisions and boundaries

- Migrations are applied to remote D1 **only through the `D1 migrations` GitHub Action**, manually dispatched by the owner (owner decision, 2026-11-11). No ad-hoc remote schema changes through other tools.
- Additive migrations only; never edit an applied migration; keep 0001 unchanged.
- Order of operations: apply remote migrations **before** any deploy that includes the `DB` binding. Once deployed with the binding, `getStore` switches from MemoryStore to D1Store; without tables the API would fail.
- All new platform code only in `harvey-moeid/byga-ai-studio`. Do not modify `mcpnew`, `hyperframes`, `remotion`, `suara` (repos, branches, Actions, secrets, databases, buckets, KV, deployments, domains). Note: an existing account D1 named `mcpnew` is a legacy resource; do not touch it.
- No new Cloudflare resources, bindings, secrets, workflows dispatches or deployments without explicit owner approval each time.
- Production-only deployment policy; no preview/staging environment.
- Adapters stay isolated and default-off until contracts and security controls are verified.
- Never expose provider secrets or shared passcodes to browser code.
- Remotion legacy submit has no application auth; status/output are public; Studio must enforce authorization and rate limits before routing. Legacy submit triggers GitHub workflow dispatch and writes legacy KV/R2.
- No provider idempotency key; never auto-replay an ambiguous submit/cancel POST.
- Assets are metadata-only; job outputs are mock references until authorized real integration.
- Single-operator auth is not multi-user isolation. Suara stays blocked by licensing.
- Distinguish source-inspected, fixture-tested, CI-tested, locally-runtime-verified, remote-verified and production-enabled claims.

## 6. Known risks / unresolved items

- Remote D1 is empty until the workflow is run; deploying before that breaks the API.
- Deployment mechanism is undefined in the repo.
- Environment protection and secrets unverified (see section 3).
- Remotion runtime URL and live behavior unverified; public routes and non-atomic quota need Studio-side controls.
- No project/user data separation beyond a single operator; retention, backup/restore, real media storage and upload limits open.
- HyperFrames base URL unverified; MCPNEW OAuth untested.
- Manual accessibility/mobile/desktop acceptance incomplete.

## 7. Not done in this session (explicitly)

No remote migration, no workflow dispatch, no deployment, no secret changes, no live Remotion calls, no change to legacy repositories or other D1 databases.

## 8. One exact next action

1. Owner reviews and merges the PR (CI green on its final head).
2. In GitHub → Actions → `D1 migrations` → Run workflow on `main` with `dry_run=true`; approve the `production` environment gate; confirm the list shows 0001 and 0002 as pending.
3. Re-run with `dry_run=false`; confirm both applied, then verify tables exist in the remote D1.
4. Only then decide on a deployment.

After that: manual login review at desktop/360px, Remotion runtime contract verification (read-only unless separately approved), HyperFrames adapter, MCPNEW onboarding, Suara after licensing.
