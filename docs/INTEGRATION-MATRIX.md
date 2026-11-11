# Legacy Integration Matrix

**Audit date:** 2026-11-10. Source-level audit completed in the requested order: MCPNEW → HyperFrames → Remotion → Suara. This is read-only discovery; no legacy repository or infrastructure was changed.

| System | Intended role | Verified contract / evidence | Current status | Main blockers |
|---|---|---|---|---|
| MCPNEW | MCP tools and orchestration | `src/index.ts`, `src/github-handler.ts`, `src/mcp-agent.ts`, `installation.json`; MCP endpoint `/mcp`, OAuth routes and MCP tool registrations | Source verified; runtime not tested | OAuth discovery/client registration/handshake and per-action authorization not tested; do not transfer ChatGPT connector credentials |
| HyperFrames | HTML/CSS/GSAP video rendering | `cloudflare-free/worker/src/index.js`, `cloudflare-free/worker/wrangler.jsonc`, `.github/workflows/render-video.yml`; `POST /render`, `POST /asset`, `GET /status/:id`, `GET /video/:id` | Source verified; runtime not tested | Exact deployed base URL unresolved; render with HTML and asset upload commit to legacy repo; dispatch writes legacy R2 |
| Remotion | React video rendering | `worker/src/index.ts`, `worker/wrangler.toml`, `.github/workflows/render.yml`; `POST /api/render`, status/cancel, uploads and public output | Source verified; runtime not tested | Submit endpoint lacks app auth in inspected handler; public job/output routes; non-atomic KV quota; dispatch writes legacy KV/R2 |
| Suara | Audio, speech and voice generation | `worker/src/index.ts`, `worker/wrangler.toml`, `.github/workflows/render.yml`, `scripts/render.py`; multipart submit, passcode, internal runner and MP3/WAV output | Source verified; runtime not tested | Shared passcode; no cancel/idempotency; legacy D1/R2 and Actions mutation; current pretrained weights CC-BY-NC |

## Source revisions inspected

| Repository | Branch | Commit SHA |
|---|---|---|
| `harvey-moeid/mcpnew` | `main` | `70769ac982f7046c4f6c77ff6c4a246722d40bd7` |
| `harvey-moeid/hyperframes` | `main` | `611aadd7a98c8c44ac2bc3d8f374e045764b00d2` |
| `harvey-moeid/remotion` | `main` | `26a8198a0f85f92afdb45db690ee8c9529c87e06` |
| `harvey-moeid/suara` | `main` | `8359c74da1471776702c051c4df1eaa2364990a1` |

## Verified Cloudflare inventory (read-only)

The connected Cloudflare account returned these legacy Worker script names: `github-mcp-server`, `hyperframes-render`, `remotion-api`, and `omnivoice-studio`. The Pages project inventory did not contain a project named `byga-ai-studio`; the Worker inventory did not contain a script named `byga-ai-studio`.

This does not authorize changes to any listed resource. No secret values were requested or changed.

## Required evidence per system

- Repository and commit SHA inspected.
- Exact route/handler and HTTP method.
- Auth mechanism and token scopes.
- Request/response schemas and error cases.
- Job ID, state transitions, progress and cancellation support.
- Webhook/dispatch or polling behavior.
- Output storage, URL access, MIME and retention.
- Upload limits, MIME constraints and CORS.
- Rate limits, timeouts, retries and idempotency.
- Licensing/commercial-use restrictions.

## Confidence labels

- **Source verified:** direct handler/config/workflow source was inspected at the commit above.
- **Runtime unverified:** no live API call or generation/render request was made.
- **Blocked:** runtime test would require OAuth client registration, a legacy workflow dispatch, or legacy resource mutation that is outside current authorization.

## Explicit no-touch list

- `harvey-moeid/mcpnew`
- `harvey-moeid/hyperframes`
- `harvey-moeid/remotion`
- `harvey-moeid/suara`

No commits, PRs, issues, workflow dispatches, secret/config changes, resource mutations or deployments were performed in these repositories.
