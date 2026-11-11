# API Contract Register

**Audit date:** 2026-11-10  
**Audit level:** source-verified; runtime contract tests are not yet authorized  
**Rule:** no undocumented endpoint, payload, credential, or provider capability may be implemented.

## Readiness summary

| Adapter | Verified integration mechanism | Source-level status | Runtime status | Production readiness |
|---|---|---|---|---|
| MCPNEW | MCP server over `/mcp` with OAuth 2.0 | Protocol entry and OAuth route configuration verified | Discovery, client registration, handshake and tool invocation not tested | Blocked |
| HyperFrames | HTTP Worker + GitHub `repository_dispatch` | Submit, asset, status and output contracts verified | Base URL and live request/response not tested | Blocked |
| Remotion | HTTP Worker + GitHub `workflow_dispatch` | Submit, status, cancel and output contracts verified | Live request/response not tested | Blocked |
| Suara | HTTP Worker + GitHub `repository_dispatch` | Multipart submit, polling, internal runner and audio output contracts verified | Live request/response not tested | Blocked; model licensing blocks commercial use |

A source-level contract is not proof that credentials, deployed bindings, CORS, runtime behavior, quotas or current production state work.

## 1. MCPNEW

**Repository:** `harvey-moeid/mcpnew`  
**Audited commit:** `70769ac982f7046c4f6c77ff6c4a246722d40bd7`  
**Public origin configured in source:** `https://mcpnew.muidsoft.com`

### Protocol and routes

MCPNEW is not a generic REST job API. Its Worker mounts an MCP server through `McpAgent` and an OAuth provider.

| Purpose | Method | Path / mechanism | Evidence |
|---|---|---|---|
| MCP protocol endpoint | MCP HTTP transport | `/mcp` | `src/index.ts` |
| OAuth authorization | GET/POST | `/authorize` | `src/index.ts`, `src/github-handler.ts` |
| OAuth token | OAuth token endpoint | `/token` | `src/index.ts` |
| Dynamic client registration | OAuth registration endpoint | `/register` | `src/index.ts` |
| GitHub OAuth callback | GET | `/callback` | `src/github-handler.ts` |
| Dashboard login | GET | `/dashboard/login` | `src/github-handler.ts` |

The configured OAuth upstream scope is `repo read:user workflow`. The callback obtains a GitHub access token and passes the authenticated GitHub identity and token into the MCP session. An allowlist is applied by the legacy service.

### MCP capabilities

The source registers MCP tools for GitHub repository/file/PR/branch/workflow operations, Cloudflare resources, R2/file operations, notes, skills and web. Several tools are mutating or destructive. Tool invocation must therefore be authorized per action, not treated as read-only merely because the transport is MCP.

The MCP agent uses `McpServer` and `McpAgent`; package dependencies include `@modelcontextprotocol/sdk`, `@modelcontextprotocol/client`, `@modelcontextprotocol/server`, `agents` and `zod`.

### Integration decision

- Use an MCP client and the OAuth flow; do not invent REST endpoints for MCP tools.
- Keep OAuth tokens server-side. Never place the legacy GitHub access token in browser code or Studio logs.
- Require explicit user connection/consent and action-level authorization.
- Do not register an OAuth client, invoke write tools, or use the MCP endpoint for production until a separate approved runtime test is available.
- The current ChatGPT connector session is not a credential that can be transferred to the Studio backend.

**Evidence:** [Worker entry](https://github.com/harvey-moeid/mcpnew/blob/main/src/index.ts), [OAuth handler](https://github.com/harvey-moeid/mcpnew/blob/main/src/github-handler.ts), [MCP agent](https://github.com/harvey-moeid/mcpnew/blob/main/src/mcp-agent.ts), [installation config](https://github.com/harvey-moeid/mcpnew/blob/main/installation.json).

## 2. HyperFrames

**Repository:** `harvey-moeid/hyperframes`  
**Audited commit:** `611aadd7a98c8c44ac2bc3d8f374e045764b00d2`  
**Worker script observed in Cloudflare:** `hyperframes-render`  
**Base URL:** pending exact deployed hostname verification. `wrangler.jsonc` enables `workers_dev` but does not declare a custom domain.

### Routes and contracts

| Operation | Method | Path | Authentication |
|---|---|---|---|
| Submit render | POST | `/render` | `x-api-key` |
| Commit composition asset | POST | `/asset` | `x-api-key` |
| Read job status | GET | `/status/:id` | None in handler |
| Retrieve MP4 | GET/HEAD | `/video/:id` | None in handler |

**POST `/render` JSON body:**

- `id?`: string matching `^[a-zA-Z0-9_-]{1,64}$`; generated UUID when omitted.
- `composition?`: same ID pattern; defaults to `contoh`, or `web-<id>` when `html` is supplied.
- `quality?`: `draft`, `standard` or `high`; defaults to `standard`.
- `html?`: non-empty HTML string; maximum 256 KiB.

Limits: request body maximum 1 MiB; composition HTML maximum 256 KiB. Existing successful object IDs return HTTP 409. Successful dispatch returns HTTP 202 with `id`, `composition`, `quality`, `status: "queued"`, `status_url` and `video_url`. If HTML is submitted, the Worker commits the composition to the legacy GitHub repository before dispatch.

**POST `/asset` JSON body:**

- `composition`: valid composition ID.
- `filename`: basename matching the source regex; no path separators.
- `data`: base64-encoded bytes.

Maximum decoded asset size: 8 MiB. Success returns HTTP 201 with composition, filename, repository path, relative `src`, commit SHA and byte count. This operation commits the asset into the legacy repository.

**Dispatch:** GitHub `repository_dispatch`, event type `render-video`; client payload contains `id`, `composition`, `quality`, and optional `sha` of the composition commit.

**Workflow:** `.github/workflows/render-video.yml`; checks out the composition at the requested SHA, runs HyperFrames CLI version `0.9.19`, validates MP4, and uploads `renders/<id>.mp4` to the existing R2 bucket. Runner timeout is 30 minutes; workflow rejects MP4 files above 300 MiB.

**GET `/status/:id`:**

- HTTP 200: `{ id, status: "done", size, uploaded, video_url }`.
- HTTP 410: `{ id, status: "failed", reason, run_url? }`.
- HTTP 404: `{ id, status: "not_ready" }`.

**GET/HEAD `/video/:id`:** reads `renders/<id>.mp4` from R2; GET supports HTTP Range and returns 206 for partial content.

### Lifecycle and limitations

- Source-visible states: `queued`, `done`, `failed`; no numeric progress or cancellation route was found.
- No `Idempotency-Key` contract was found. Caller-supplied IDs can collide; use a generated unique ID and do not automatically replay POST after an ambiguous timeout.
- Status and video handlers do not require the render API key.
- Render with `html` and every `/asset` request mutate the legacy GitHub repository. Any render submission triggers a legacy workflow and writes output to legacy R2.
- No verified retention/expiry policy was found in the inspected workflow/config.

**Evidence:** [Worker routes and handlers](https://github.com/harvey-moeid/hyperframes/blob/main/cloudflare-free/worker/src/index.js), [Worker config](https://github.com/harvey-moeid/hyperframes/blob/main/cloudflare-free/worker/wrangler.jsonc), [render workflow](https://github.com/harvey-moeid/hyperframes/blob/main/.github/workflows/render-video.yml).

## 3. Remotion

**Repository:** `harvey-moeid/remotion`  
**Audited commit:** `26a8198a0f85f92afdb45db690ee8c9529c87e06`  
**Worker script observed in Cloudflare:** `remotion-api`  
**Base URL used by render workflow:** `https://remotion-api.harveymoeid.workers.dev`

### Routes and contracts

| Operation | Method | Path | Authentication |
|---|---|---|---|
| Health/info | GET | `/` | None |
| Submit render | POST | `/api/render` | No application auth in inspected handler |
| Read job | GET | `/api/jobs/:id` | None |
| Cancel job | POST | `/api/jobs/:id/cancel` | None |
| Read custom code | GET | `/api/jobs/:id/code` | Bearer `UPLOAD_TOKEN` |
| Report render status | POST | `/api/jobs/:id/status` | Bearer `UPLOAD_TOKEN` |
| Upload MP4 | PUT/POST | `/upload?jobId=:id` | Bearer `UPLOAD_TOKEN` |
| Upload thumbnail | PUT/POST | `/upload-thumb?jobId=:id` | Bearer `UPLOAD_TOKEN` |
| Retrieve MP4 | GET | `/files/:id.mp4` | None |
| Retrieve thumbnail | GET | `/thumbs/:id.jpg` | None |

**POST `/api/render` JSON body:**

- `template`: required string matching `^[A-Za-z0-9_-]{1,40}$`.
- `ratio?`: `9:16` or `16:9`; default `9:16`.
- `props?`: JSON object; maximum serialized length 20,000 characters.
- For `template: "CustomCode"`: `accessCode` and `code` are required; code must include `export default` and is limited to 100,000 characters.

Success returns HTTP 202 with `{ jobId }`. The Worker stores a job in KV and dispatches workflow `render.yml` using GitHub `workflow_dispatch` inputs `jobId`, `template`, `ratio` and serialized `props`.

**Status:** `queued`, `rendering`, `done`, `failed`, `cancelled`. GET returns the job fields and `videoUrl`/ `thumbUrl` when available. UI uses polling. Cancellation is supported only while queued/rendering; it marks the job cancelled before asking GitHub Actions to cancel the run.

**Output:** MP4 in R2 key `renders/<id>.mp4`; thumbnail in `thumbs/<id>.jpg`. MP4 upload maximum 90 MiB, thumbnail maximum 2 MiB. Retention configuration is seven days. The workflow uses an Ubuntu runner with a 20-minute timeout.

### Security and reliability findings

- CORS allowlisting is present, but CORS is not authentication. The inspected `POST /api/render` handler has no user/session authentication.
- Job status, cancellation and media retrieval are public in the inspected handlers.
- Runner upload/status endpoints require Bearer `UPLOAD_TOKEN`.
- Daily quota is 50 renders in Worker configuration. The read-then-write KV counter is not an atomic reservation under concurrent submits; quota overshoot is possible.
- No idempotency key is accepted. Each accepted request creates a new UUID and may create duplicate work on client retries.
- Submitting a render dispatches a workflow in the legacy repository and writes job/output state to legacy KV/R2.

**Evidence:** [Worker source](https://github.com/harvey-moeid/remotion/blob/main/worker/src/index.ts), [Worker config](https://github.com/harvey-moeid/remotion/blob/main/worker/wrangler.toml), [render workflow](https://github.com/harvey-moeid/remotion/blob/main/.github/workflows/render.yml).

## 4. Suara

**Repository:** `harvey-moeid/suara`  
**Audited commit:** `8359c74da1471776702c051c4df1eaa2364990a1`  
**Worker script observed in Cloudflare:** `omnivoice-studio`  
**Default base URL in render workflow:** `https://omnivoice-studio.harveymoeid.workers.dev`; `WORKER_URL` may override it.

### Routes and contracts

| Operation | Method | Path | Authentication |
|---|---|---|---|
| Health | GET | `/api/health` | None |
| Auth check | GET | `/api/auth` | `x-passcode` |
| Metadata/quota | GET | `/api/meta` | `x-passcode` |
| Submit audio | POST | `/api/jobs` | `x-passcode` |
| List jobs | GET | `/api/jobs` | `x-passcode` |
| Read job | GET | `/api/jobs/:id` | `x-passcode` |
| Retrieve audio | GET | `/api/jobs/:id/audio?fmt=mp3|wav` | `x-passcode` |
| Runner API | `/api/internal/*` | Various | Bearer `JOB_TOKEN` |

**POST `/api/jobs` uses multipart/form-data:**

- `text`: required, configured maximum 1,500 characters.
- `mode`: `auto`, `clone` or `design`; default `auto`.
- `language`: 2–3 lowercase letters; default `id`.
- `num_step`: 8, 16 or 32; default 16.
- `speed`: 0.5–2; default 1.
- `instruct`: required valid attributes for `design`.
- `ref_text`: maximum 500 characters.
- `consent`: must be `true` for clone mode.
- `ref`: audio file required for clone mode; maximum 10 MiB.

The Worker stores job input and optional reference audio in R2, creates a D1 job in `queued` state, then sends GitHub `repository_dispatch` event `tts-render` with client payload `{ job_id }`. Success returns HTTP 201 with `{ job_id }`; dispatch failure returns HTTP 502 and marks the job failed.

**Lifecycle:** `queued` → `running` → `done` or `failed`. Numeric progress is available as `{ done, total }`; no cancellation endpoint was found.

**Runner-only endpoints:** Bearer `JOB_TOKEN` protects `/api/internal/claim`, input/reference retrieval, progress reporting, MP3/WAV result upload and status reporting. Results are uploaded to `jobs/<id>/output.mp3` and `jobs/<id>/output.wav`. The runner uses CPU, processes queued jobs serially and has a 350-minute workflow timeout. One render concurrency group is configured.

**Limits/config:** daily quota 20 jobs, text maximum 1,500 characters, reference maximum 10 MiB and 30 seconds, result maximum 60 MiB, seven-day retention. The public audio endpoint requires the shared passcode. No per-user identity, cancellation or idempotency key was found.

### Licensing blocker

The official OmniVoice model card states that code is Apache 2.0 but pretrained weights are CC-BY-NC. The bundled audio tokenizer may have additional terms. Commercial use of the current weights is therefore not approved by this audit. Replace the model or obtain appropriate rights before enabling commercial audio generation.

**Evidence:** [Worker source](https://github.com/harvey-moeid/suara/blob/main/worker/src/index.ts), [Worker config](https://github.com/harvey-moeid/suara/blob/main/worker/wrangler.toml), [render workflow](https://github.com/harvey-moeid/suara/blob/main/.github/workflows/render.yml), [runner](https://github.com/harvey-moeid/suara/blob/main/scripts/render.py), [official model card](https://huggingface.co/k2-fsa/OmniVoice).

## Cross-provider contract rules

1. All three render engines trigger GitHub Actions in their legacy repositories. No submit, cancel, asset upload, workflow dispatch or output mutation was executed during this audit.
2. No common idempotency key exists across providers. Studio must not automatically retry a submit request after an ambiguous timeout.
3. Provider status and output URLs have different access controls. Keep provider credentials and passcodes server-side; Studio API must enforce project/job authorization before exposing outputs.
4. Normalize only confirmed states. Preserve provider status and raw safe metadata.
5. Expose cancellation only for Remotion until another provider contract is verified.
6. Do not copy, move, delete or rewrite media in legacy R2 buckets without separate approval.
7. Runtime health, CORS, OAuth discovery, token exchange, live job success/failure, actual output retrieval, expiration and current secret validity remain untested.

## Approval gate

Adapters remain disabled until:
- exact production base URL and deployed contract are verified;
- authentication and server-side secret handling pass;
- an explicitly authorized runtime test covers success, failure, timeout and duplicate submission;
- output access and project-level authorization are proven;
- model, tokenizer, fonts and media licensing is approved;
- no legacy mutation occurs without separate explicit authorization.
