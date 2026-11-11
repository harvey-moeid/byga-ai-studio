# Phase 4.6 — Composition workspace and render library

**Implementation branch:** `feat/phase-4-6-composition-workspace-v2`  
**Pull request:** #23  
**Scope:** implementation proposal; not yet merged or deployed.

## Delivered in this PR

### C1 — Studio-owned compositions
- Project-scoped composition records for HyperFrames HTML and Remotion TSX.
- Immutable source versions in the existing private `byga-ai-studio-assets` R2 bucket.
- D1 metadata tables in additive migration `0003_compositions.sql`.
- Create/list/rename/archive, version save, source retrieval and SHA-256 metadata.
- No legacy repository export or write as part of normal source save.

### C2/C3 — Gated render adapters
- Remotion `CustomCode` contract: `POST /api/render`, status `GET /api/jobs/:id`.
- HyperFrames contract: `POST /render`, status `GET /status/:id`.
- Provider adapters are default-off. Server-side enable/approval flags and provider credentials are required.
- Every UI render request requires an explicit per-render consent checkbox.
- HyperFrames submits HTML, which commits source into the legacy HyperFrames repository.
- Remotion dispatches a GitHub Actions workflow and writes provider job/output state to legacy KV/R2.
- Ambiguous submissions are not automatically retried. The job remains inspectable as `submitted` when the provider outcome cannot be determined.

### C4 — Render output
- Provider status is reconciled through an authenticated Studio endpoint.
- MP4 and Remotion thumbnail are proxied through Studio authentication; provider URLs are not sent to the browser.
- HTTP Range headers are forwarded for MP4 playback and seeking.
- Render Library lists only real render jobs; mock/simulation jobs are never represented as media.
- Current output retention follows provider policy (Remotion: seven days; HyperFrames retention not verified). Output is proxied, not copied into Studio R2.

## Provider environment bindings (server-side only)\n\nAll flags are default-off and require the string value `1` to enable. Do not add credentials to Git or browser configuration.\n\n- Remotion: `REMOTION_ENABLED`, `REMOTION_RENDER_APPROVED`, `REMOTION_BASE_URL`, `REMOTION_ACCESS_CODE`.\n- HyperFrames: `HYPERFRAMES_ENABLED`, `HYPERFRAMES_RENDER_APPROVED`, `HYPERFRAMES_BASE_URL`, `HF_HEADER_VALUE` (sent as the provider's `x-api-key` header).\n\n`REMOTION_RENDER_APPROVED` and `HYPERFRAMES_RENDER_APPROVED` are explicit server-side owner gates; the UI also requires per-render confirmation.\n\n## Required owner approvals before production acceptance

1. Apply `0003_compositions.sql` using the existing D1 migrations workflow after explicit approval.
2. Verify the exact HyperFrames deployed base URL. It is unresolved in the audit and must not be guessed.
3. Configure server-side provider credentials and default-off flags through a secure settings path; never place secrets in Git or chat.
4. Approve a specific test render per engine. Each render dispatches a legacy workflow and writes legacy provider resources. HyperFrames HTML also commits source to its legacy repository.
5. Verify authenticated video Range playback, thumbnail retrieval, status polling, failure handling and provider retention.
6. Obtain any separate production deployment approval.

## Known limitations / follow-up

- HTML preview is isolated in a sandboxed iframe. Remotion TSX source editing is available, but browser frame preview requires a Remotion bundler/runtime and is not yet implemented.
- The editor uses a lightweight native code textarea; Monaco/CodeMirror integration is a future UX improvement.
- HyperFrames exact base URL is unresolved. Adapter remains unavailable until configured and verified.
- Provider-side routes are unauthenticated for status/media in the audited legacy contracts; Studio protects its own routes, but legacy provider endpoints remain public as documented.
- The D1 migration is included but intentionally not applied. No live composition CRUD or render was run in production.
- No changes were made to legacy repositories, buckets, KV, secrets or deployments.

## Acceptance status

| Check | Status |
|---|---|
| Static lint/typecheck/tests/build | Pending CI on PR #23 |
| D1 migration preflight/apply | Not run; owner approval required |
| Production R2 round-trip | Not run |
| Remotion runtime health / render | Not run; owner approval and secure configuration required |
| HyperFrames runtime health / render | Not run; exact base URL and owner approval required |
| Authenticated MP4 Range playback | Code path added; runtime unverified |
| Production deployment | Not performed |
