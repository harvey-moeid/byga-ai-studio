

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
