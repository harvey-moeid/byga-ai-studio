# Phase 0 — Discovery & API Contract Audit

**Project:** BYGA AI Studio  
**Date:** 2026-11-10  
**Scope:** read-only inspection of the new Studio repository, PR #1, the four legacy repositories and Cloudflare resource inventory.  
**Order:** MCPNEW → HyperFrames → Remotion → Suara.

## 1. Executive result

<badge>Source-level audit completed</badge>

All four legacy repositories were inspected at their latest observed `main` commits. Their Worker handlers, workflow files, relevant configuration and provider job/output paths were reviewed. The five foundation documents and PR #1 were inspected.

**Phase 0 is not fully closed.** Runtime OAuth/MCP handshake, exact HyperFrames base URL, live provider responses, real output retrieval and authorized end-to-end render tests remain unverified. No legacy workflow dispatch, render submit, cancel, asset upload, commit, resource mutation, secret change or deployment was executed.

## 2. BYGA AI Studio repository and PR #1

- Repository: `harvey-moeid/byga-ai-studio`
- Default branch: `main`
- Visibility: public
- PR #1: [docs: establish BYGA AI Studio product and architecture baseline](https://github.com/harvey-moeid/byga-ai-studio/pull/1)
- State: open, draft, mergeable
- Base: `main` at `86d93efce6237ee5678ce34b7244b4bdd5d1418d`
- Head: `docs/phase-0-foundation` at `d2b5c70afe8bc925139df26d920e7de5c38ce646`
- PR changes before this audit update: six files, 280 additions, zero deletions
- Reviews: none
- Review threads: none
- Check runs on PR head: zero
- PR-triggered workflow runs returned by the connector: zero

Five foundation docs plus `SECURITY.md` were reviewed. PR #1 is documentation-only; no application implementation or production workflow was present in the reviewed patch. No merge was performed.

## 3. Legacy repository revisions

| Repository | Observed main HEAD |
|---|---|
| `harvey-moeid/mcpnew` | `70769ac982f7046c4f6c77ff6c4a246722d40bd7` |
| `harvey-moeid/hyperframes` | `611aadd7a98c8c44ac2bc3d8f374e045764b00d2` |
| `harvey-moeid/remotion` | `26a8198a0f85f92afdb45db690ee8c9529c87e06` |
| `harvey-moeid/suara` | `8359c74da1471776702c051c4df1eaa2364990a1` |

### MCPNEW evidence

- `src/index.ts`: OAuth provider mounts `/mcp`, `/authorize`, `/token`, `/register`.
- `src/github-handler.ts`: GitHub OAuth authorization, callback and token exchange; scope string is `repo read:user workflow`.
- `src/mcp-agent.ts`: MCP server and tool registrations; GitHub, Cloudflare, files/R2, skills and web capability groups.
- `installation.json`: public origin `https://mcpnew.muidsoft.com`.

Decision: MCP client/OAuth integration, not a guessed REST adapter. Client registration and tool invocation remain untested.

### HyperFrames evidence

- `cloudflare-free/worker/src/index.js`: `/render`, `/asset`, `/status/:id`, `/video/:id`; request validation, API key checks, GitHub Contents API commits, dispatch and R2 status/output.
- `cloudflare-free/worker/wrangler.jsonc`: Worker `hyperframes-render`, R2 binding `VIDEOS`, bucket `hyperframes-renders`, `workers_dev: true`; no custom domain is declared here.
- `.github/workflows/render-video.yml`: repository_dispatch event `render-video`, HyperFrames CLI 0.9.19, 30-minute runner timeout and R2 output.

Decision: use only existing compositions until separate permission allows repository writes. Exact public base hostname remains unresolved.

### Remotion evidence

- `worker/src/index.ts`: submit, status, cancel, runner upload/status and public output routes.
- `worker/wrangler.toml`: Worker `remotion-api`, KV `JOBS`, R2 `remotion-renders`, 50/day quota, seven-day retention.
- `.github/workflows/render.yml`: `workflow_dispatch` inputs `jobId`, `template`, `props`, `ratio`; runner timeout 20 minutes; upload through Bearer `UPLOAD_TOKEN`.

Decision: protect public provider routes behind Studio auth. Do not use CORS as authorization. Add Studio-side quota and submit deduplication controls.

### Suara evidence

- `worker/src/index.ts`: multipart submit, `x-passcode` middleware, Bearer `JOB_TOKEN` internal routes, D1/R2 job storage, progress, result and status endpoints.
- `worker/wrangler.toml`: Worker `omnivoice-studio`, D1 `omnivoice-studio`, R2 `omnivoice-studio`, daily quota 20, text maximum 1,500 characters, retention seven days.
- `.github/workflows/render.yml`: `repository_dispatch` event `tts-render`, one render concurrency group and 350-minute runner timeout.
- `scripts/render.py`: CPU runner claims queued jobs, downloads references, reports progress, uploads MP3/WAV and reports completion.

Decision: keep passcode and job token server-side; enforce Studio project access; no Cancel capability until provider adds one or an alternative is approved.

## 4. Cloudflare read-only inventory

The Cloudflare connector authenticated successfully. Read-only inventory showed legacy Workers:

- `github-mcp-server`
- `hyperframes-render`
- `remotion-api`
- `omnivoice-studio`

The Pages project inventory did not include `byga-ai-studio`; the Worker script inventory did not include `byga-ai-studio`. No Cloudflare resource was created or changed. This inventory is not a deployment authorization.

## 5. License review

- HyperFrames repository includes Apache License 2.0.
- Remotion's official licensing terms provide a free tier for eligible individuals and organizations up to three employees; other entities may need a Company License. Confirm eligibility before commercial deployment.
- The official OmniVoice model card distinguishes Apache 2.0 code from CC-BY-NC pretrained weights. The current Suara model weights are therefore not approved for commercial generation. Review the bundled audio tokenizer's separate terms as well.
- MCPNEW, Remotion fork and Suara repositories did not expose a root `LICENSE` file at the inspected default branch path. Do not infer an open-source license for those repository-specific modifications.

References: [OmniVoice model card](https://huggingface.co/k2-fsa/OmniVoice), [Remotion licensing](https://www.remotion.pro/license).

## 6. Runtime test boundary

The following were deliberately not executed because they would mutate legacy systems or require a new OAuth registration:

- MCPNEW OAuth client registration, token exchange, MCP handshake and tool invocation.
- HyperFrames `POST /render`, `POST /asset` or repository dispatch.
- Remotion `POST /api/render`, cancel or workflow dispatch.
- Suara `POST /api/jobs` or any runner workflow.
- Legacy R2/D1/KV writes, secret changes, deployment or migration.

A GET health request may be considered separately after exact base URL and impact are established. A generation/render request requires explicit approval for the specific legacy workflow and resulting resource writes.

## 7. Files and tests

- Source repositories: read only.
- Studio code implementation: none.
- Studio documentation: updated in this PR branch.
- Unit tests, lint, typecheck and build: not run; this audit changes documentation only.
- Production deployment: not performed.

## 8. Exit assessment

**Phase 0: PARTIALLY COMPLETE — source contracts verified, runtime and licensing gates remain open.**

Safe to proceed with documentation review and Phase 1 planning. Not safe to implement or enable production engine adapters yet.
