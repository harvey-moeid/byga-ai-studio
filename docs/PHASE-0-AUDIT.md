# Phase 0 — Discovery & API Contract Audit

**Project:** BYGA AI Studio  
**Date:** 2026-11-10  
**Scope:** read-only inspection of the new Studio repository, PR #1, the four legacy repositories and Cloudflare resource inventory.  
**Order:** MCPNEW → HyperFrames → Remotion → Suara.

## 1. Executive result

Source-level audit completed. All four legacy repositories were inspected at their latest observed `main` commits. Their Worker handlers, workflow files, relevant configuration and provider job/output paths were reviewed. The five foundation documents and PR #1 were inspected.

**Phase 0 is not fully closed.** Runtime OAuth/MCP handshake, exact HyperFrames base URL, live provider responses, real output retrieval and authorized end-to-end render tests remain unverified. No legacy workflow dispatch, render submit, cancel, asset upload, commit, resource mutation, secret change or deployment was executed.

## 2. BYGA AI Studio repository and PR #1

- Repository: `harvey-moeid/byga-ai-studio`
- Default branch: `main`
- Visibility: public
- PR #1: [docs: establish BYGA AI Studio product and architecture baseline](https://github.com/harvey-moeid/byga-ai-studio/pull/1)
- State: open, draft; latest connector snapshot reports mergeable=false (recheck before merge)
- Base: `main` at `86d93efce6237ee5678ce34b7244b4bdd5d1418d`
- Head: `docs/phase-0-foundation`; latest observed audit commit `1b6fa3a7ce3cec6b47c64c149028dfcd76378d80`
- PR changes after audit documentation updates: eight files, 705 additions, zero deletions
- Reviews: none
- Review threads: none
- Check runs on the original PR head: zero
- PR-triggered workflow runs returned by the connector: zero

Five foundation docs plus `SECURITY.md` were reviewed. PR #1 is documentation-only; no application implementation or production workflow was present in the reviewed patch. No merge was performed.

## 3. Legacy repository revisions

| Repository | Observed main HEAD |
|---|---|
| `harvey-moeid/mcpnew` | `70769ac982f7046c4f6c77ff6c4a246722d40bd7` |
| `harvey-moeid/hyperframes` | `611aadd7a98c8c44ac2bc3d8f374e045764b00d2` |
| `harvey-moeid/remotion` | `26a8198a0f85f92afdb45db690ee8c9529c87e06` |
| `harvey-moeid/suara` | `8359c74da1471776702c051c4df1eaa2364990a1` |

## 4. Contract findings

### MCPNEW

- `src/index.ts`: OAuth provider mounts `/mcp`, `/authorize`, `/token`, `/register`.
- `src/github-handler.ts`: GitHub OAuth authorization, callback and token exchange; scope string is `repo read:user workflow`.
- `src/mcp-agent.ts`: MCP server and tool registrations; GitHub, Cloudflare, files/R2, skills and web capability groups.
- `installation.json`: public origin `https://mcpnew.muidsoft.com`.

Decision: MCP client/OAuth integration, not a guessed REST adapter. Client registration and tool invocation remain untested.

### HyperFrames

- `cloudflare-free/worker/src/index.js`: `/render`, `/asset`, `/status/:id`, `/video/:id`; request validation, API key checks, GitHub Contents API commits, dispatch and R2 status/output.
- `cloudflare-free/worker/wrangler.jsonc`: Worker `hyperframes-render`, R2 binding `VIDEOS`, bucket `hyperframes-renders`, `workers_dev: true`; no custom domain is declared here.
- `.github/workflows/render-video.yml`: repository_dispatch event `render-video`, HyperFrames CLI 0.9.19, 30-minute runner timeout and R2 output.

Decision: use only existing compositions until separate permission allows repository writes. Exact public base hostname remains unresolved.

### Remotion

- `worker/src/index.ts`: submit, status, cancel, runner upload/status and public output routes.
- `worker/wrangler.toml`: Worker `remotion-api`, KV `JOBS`, R2 `remotion-renders`, 50/day quota, seven-day retention.
- `.github/workflows/render.yml`: `workflow_dispatch` inputs `jobId`, `template`, `props`, `ratio`; runner timeout 20 minutes; upload through Bearer `UPLOAD_TOKEN`.

Decision: protect public provider routes behind Studio auth. Do not use CORS as authorization. Add Studio-side quota and submit deduplication controls.

### Suara

- `worker/src/index.ts`: multipart submit, `x-passcode` middleware, Bearer `JOB_TOKEN` internal routes, D1/R2 job storage, progress, result and status endpoints.
- `worker/wrangler.toml`: Worker `omnivoice-studio`, D1 `omnivoice-studio`, R2 `omnivoice-studio`, daily quota 20, text maximum 1,500 characters, retention seven days.
- `.github/workflows/render.yml`: `repository_dispatch` event `tts-render`, one render concurrency group and 350-minute runner timeout.
- `scripts/render.py`: CPU runner claims queued jobs, downloads references, reports progress, uploads MP3/WAV and reports completion.

Decision: keep passcode and job token server-side; enforce Studio project access; no Cancel capability until provider adds one or an alternative is approved.

## 5. Cloudflare read-only inventory

The Cloudflare connector authenticated successfully. Read-only inventory showed legacy Workers:

- `github-mcp-server`
- `hyperframes-render`
- `remotion-api`
- `omnivoice-studio`

The Pages project inventory did not include `byga-ai-studio`; the Worker script inventory did not include `byga-ai-studio`. No Cloudflare resource was created or changed. This inventory is not a deployment authorization.

## 6. License review

- HyperFrames repository includes Apache License 2.0.
- Remotion's official licensing terms provide a free tier for eligible individuals and organizations up to three employees; other entities may need a Company License. Confirm eligibility before commercial deployment.
- The official OmniVoice model card distinguishes Apache 2.0 code from CC-BY-NC pretrained weights. The current Suara model weights are therefore not approved for commercial generation. Review the bundled audio tokenizer's separate terms as well.
- MCPNEW, Remotion fork and Suara repositories did not expose a root `LICENSE` file at the inspected default branch path. Do not infer an open-source license for those repository-specific modifications.

References: [OmniVoice model card](https://huggingface.co/k2-fsa/OmniVoice), [Remotion licensing](https://www.remotion.pro/license).

## 7. Runtime test boundary

The following were deliberately not executed because they would mutate legacy systems or require a new OAuth registration:

- MCPNEW OAuth client registration, token exchange, MCP handshake and tool invocation.
- HyperFrames `POST /render`, `POST /asset` or repository dispatch.
- Remotion `POST /api/render`, cancel or workflow dispatch.
- Suara `POST /api/jobs` or any runner workflow.
- Legacy R2/D1/KV writes, secret changes, deployment or migration.

A GET health request may be considered separately after exact base URL and impact are established. A generation/render request requires explicit approval for the specific legacy workflow and resulting resource writes.

## 8. Files and tests

- Source repositories: read only.
- Studio code implementation: none.
- Studio documentation: updated in this PR branch.
- Unit tests, lint, typecheck and build: not run; this audit changes documentation only.
- Production deployment: not performed.

## 9. Exit assessment

**Phase 0: PARTIALLY COMPLETE — source contracts verified, runtime and licensing gates remain open.**

Safe to proceed with documentation review and Phase 1 planning. Not safe to implement or enable production engine adapters yet.


## 9. Source line evidence index

Line numbers below refer to the audited `main` commits listed in Section 3.

### MCPNEW — `70769ac982f7046c4f6c77ff6c4a246722d40bd7`

- [`src/index.ts` lines 11–22](https://github.com/harvey-moeid/mcpnew/blob/70769ac982f7046c4f6c77ff6c4a246722d40bd7/src/index.ts#L11-L22): MCP endpoint and OAuth provider route configuration.
- [`src/github-handler.ts` lines 53–110](https://github.com/harvey-moeid/mcpnew/blob/70769ac982f7046c4f6c77ff6c4a246722d40bd7/src/github-handler.ts#L53-L110): authorization and approval flow.
- [`src/github-handler.ts` lines 112–180](https://github.com/harvey-moeid/mcpnew/blob/70769ac982f7046c4f6c77ff6c4a246722d40bd7/src/github-handler.ts#L112-L180): GitHub OAuth scopes, callback and token exchange.
- [`src/mcp-agent.ts` lines 25–65](https://github.com/harvey-moeid/mcpnew/blob/70769ac982f7046c4f6c77ff6c4a246722d40bd7/src/mcp-agent.ts#L25-L65): MCP agent, authenticated GitHub client and repository authorization.
- [`src/mcp-agent.ts` lines 154–413](https://github.com/harvey-moeid/mcpnew/blob/70769ac982f7046c4f6c77ff6c4a246722d40bd7/src/mcp-agent.ts#L154-L413): note, repository, file, commit, PR and code-search tool registrations.
- [`src/mcp-agent.ts` lines 724–740](https://github.com/harvey-moeid/mcpnew/blob/70769ac982f7046c4f6c77ff6c4a246722d40bd7/src/mcp-agent.ts#L724-L740): workflow dispatch and run inspection tools.
- [`installation.json`](https://github.com/harvey-moeid/mcpnew/blob/70769ac982f7046c4f6c77ff6c4a246722d40bd7/installation.json): configured public origin and tool groups.

### HyperFrames — `611aadd7a98c8c44ac2bc3d8f374e045764b00d2`

- [`cloudflare-free/worker/src/index.js` lines 149–189](https://github.com/harvey-moeid/hyperframes/blob/611aadd7a98c8c44ac2bc3d8f374e045764b00d2/cloudflare-free/worker/src/index.js#L149-L189): route map and allowed methods.
- [`cloudflare-free/worker/src/index.js` lines 292–356](https://github.com/harvey-moeid/hyperframes/blob/611aadd7a98c8c44ac2bc3d8f374e045764b00d2/cloudflare-free/worker/src/index.js#L292-L356): asset upload auth, schema, size validation and GitHub commit.
- [`cloudflare-free/worker/src/index.js` lines 358–475](https://github.com/harvey-moeid/hyperframes/blob/611aadd7a98c8c44ac2bc3d8f374e045764b00d2/cloudflare-free/worker/src/index.js#L358-L475): render auth, JSON schema, limits, composition commit, dispatch payload and 202 response.
- [`cloudflare-free/worker/src/index.js` lines 498–550](https://github.com/harvey-moeid/hyperframes/blob/611aadd7a98c8c44ac2bc3d8f374e045764b00d2/cloudflare-free/worker/src/index.js#L498-L550): status and R2 video retrieval.
- [`cloudflare-free/worker/wrangler.jsonc`](https://github.com/harvey-moeid/hyperframes/blob/611aadd7a98c8c44ac2bc3d8f374e045764b00d2/cloudflare-free/worker/wrangler.jsonc): Worker name, R2 binding and absence of an explicit custom domain.
- [`.github/workflows/render-video.yml`](https://github.com/harvey-moeid/hyperframes/blob/611aadd7a98c8c44ac2bc3d8f374e045764b00d2/.github/workflows/render-video.yml): repository dispatch, workflow inputs, render CLI version, runner and R2 output.

### Remotion — `26a8198a0f85f92afdb45db690ee8c9529c87e06`

- [`worker/src/index.ts` lines 1–104](https://github.com/harvey-moeid/remotion/blob/26a8198a0f85f92afdb45db690ee8c9529c87e06/worker/src/index.ts#L1-L104): bindings, job schema, CORS and runner Bearer authentication.
- [`worker/src/index.ts` lines 106–208](https://github.com/harvey-moeid/remotion/blob/26a8198a0f85f92afdb45db690ee8c9529c87e06/worker/src/index.ts#L106-L208): render request validation, job creation and workflow_dispatch payload.
- [`worker/src/index.ts` lines 211–269](https://github.com/harvey-moeid/remotion/blob/26a8198a0f85f92afdb45db690ee8c9529c87e06/worker/src/index.ts#L211-L269): polling and cancellation.
- [`worker/src/index.ts` lines 272–384](https://github.com/harvey-moeid/remotion/blob/26a8198a0f85f92afdb45db690ee8c9529c87e06/worker/src/index.ts#L272-L384): custom-code retrieval, runner status and MP4/thumbnail uploads.
- [`worker/src/index.ts` lines 388–468](https://github.com/harvey-moeid/remotion/blob/26a8198a0f85f92afdb45db690ee8c9529c87e06/worker/src/index.ts#L388-L468): public MP4/thumbnail retrieval and range handling.
- [`worker/wrangler.toml`](https://github.com/harvey-moeid/remotion/blob/26a8198a0f85f92afdb45db690ee8c9529c87e06/worker/wrangler.toml): Worker, KV/R2 bindings, quota and retention vars.
- [`.github/workflows/render.yml`](https://github.com/harvey-moeid/remotion/blob/26a8198a0f85f92afdb45db690ee8c9529c87e06/.github/workflows/render.yml): workflow inputs, runner timeout, status reporting and uploads.

### Suara — `8359c74da1471776702c051c4df1eaa2364990a1`

- [`worker/src/index.ts` lines 1–150](https://github.com/harvey-moeid/suara/blob/8359c74da1471776702c051c4df1eaa2364990a1/worker/src/index.ts#L1-L150): bindings, dispatch helper, health route and public/internal auth middleware.
- [`worker/src/index.ts` lines 169–255](https://github.com/harvey-moeid/suara/blob/8359c74da1471776702c051c4df1eaa2364990a1/worker/src/index.ts#L169-L255): multipart submit schema, validation, quota, R2/D1 writes and repository_dispatch.
- [`worker/src/index.ts` lines 259–310](https://github.com/harvey-moeid/suara/blob/8359c74da1471776702c051c4df1eaa2364990a1/worker/src/index.ts#L259-L310): job list, status and audio retrieval.
- [`worker/src/index.ts` lines 313–412](https://github.com/harvey-moeid/suara/blob/8359c74da1471776702c051c4df1eaa2364990a1/worker/src/index.ts#L313-L412): internal claim, input/reference, progress, result and status routes.
- [`worker/wrangler.toml`](https://github.com/harvey-moeid/suara/blob/8359c74da1471776702c051c4df1eaa2364990a1/worker/wrangler.toml): Worker, D1/R2 bindings, event type, quota and retention.
- [`.github/workflows/render.yml`](https://github.com/harvey-moeid/suara/blob/8359c74da1471776702c051c4df1eaa2364990a1/.github/workflows/render.yml): dispatch trigger, concurrency and runner timeout.
- [`scripts/render.py`](https://github.com/harvey-moeid/suara/blob/8359c74da1471776702c051c4df1eaa2364990a1/scripts/render.py): CPU runner, claim/progress/upload/status flow.

These links and line ranges support source inspection only. They do not imply that a live production endpoint was called.
