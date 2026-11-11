# Phase 4.6 — Studio-owned compositions and render outputs

**Status:** design only. No code, migration, secret, provider call or deployment is part of this document.
**Decision (owner, 2026-11-11):** the Studio becomes the source of truth for composition code and render results. Engines stay as executors.

## Where things live today

| | HyperFrames | Remotion |
|---|---|---|
| Composition code | legacy repo `harvey-moeid/hyperframes`, `cloudflare-free/compositions/` (the Worker commits submitted `html` there) | template code in repo `harvey-moeid/remotion` (`remotion/src/`); `CustomCode` source is sent per job and read by the runner from the Worker |
| Render output | R2 `hyperframes-renders`, `renders/<id>.mp4` (+ `<id>.failed.json`) | R2 `remotion-renders`, `renders/<id>.mp4`, `thumbs/<id>.jpg`, 7-day retention |
| Public access | `https://hyperframes.muidsoft.com/video/<id>`, `/status/<id>` (no auth) | `https://remotion-api.harveymoeid.workers.dev/files/<id>.mp4` (no auth) |
| Studio today | simulation only | simulation only |

## Goal

- Store compositions (code) in the Studio, per project, with immutable versions.
- Dispatch a chosen version to an engine, track the job, and show/download the result from the Studio behind its own authentication.
- Keep engines as isolated, default-off, feature-flagged adapters. Heavy rendering stays on the engines' runners, never in Worker CPU.

## Non-goals

- Rendering inside the Studio Worker.
- Editing or migrating legacy repos, buckets, KV or Actions.
- Multi-user collaboration or a public gallery.

## Data model (additive; applied only with owner approval via the `D1 migrations` workflow)

`compositions`: `id`, `project_id`, `engine` (`hyperframes` | `remotion`), `name`, `current_version`, `archived`, `created_at`, `updated_at`.

`composition_versions` (immutable): `id`, `composition_id`, `version`, `r2_key`, `size`, `sha256`, `note?`, `created_at`.

Content is stored in the existing private bucket `byga-ai-studio-assets` under `compositions/{projectId}/{compositionId}/v{n}.{html|tsx}` (binding `R2_ASSETS`, no new bucket). D1 holds metadata only.

Jobs reuse the existing `jobs` table. `input` references `{compositionId, version}`; `output` stores `{kind: 'video', provider, providerJobId, ...}` after the contracts package is extended. Provider output URLs are never exposed to the browser.

## API (all behind existing Studio auth)

- `GET|POST /api/v1/projects/:id/compositions`
- `GET|PATCH|DELETE /api/v1/compositions/:id` (delete = archive)
- `GET|POST /api/v1/compositions/:id/versions`, `GET .../versions/:n/content`
- `POST /api/v1/compositions/:id/render` (feature-flagged; creates a job)
- `GET /api/v1/jobs/:id/video` (authenticated stream/proxy with Range support)

## Engine constraints the Studio must enforce

- HyperFrames: `html` ≤ 256 KiB, request body ≤ 1 MiB, id/composition pattern `^[a-zA-Z0-9_-]{1,64}$`, quality `draft|standard|high`, output ≤ 300 MiB. Submitting `html` **commits the composition into the legacy repo** and dispatches a legacy workflow.
- Remotion `CustomCode`: code must contain `export default`, ≤ 100,000 characters; `props` ≤ 20,000 characters serialized; ratio `9:16` or `16:9`; needs the legacy `accessCode`; daily quota 50 (non-atomic); output ≤ 90 MiB; 7-day retention.
- Neither engine has an idempotency key. Never auto-retry an ambiguous submit; the user checks job history first.
- Both execute submitted code on a GitHub runner. This is acceptable only because the Studio is single-operator. Do not open composition submission to other users.

## Work packages

1. **C1 — Compositions without any engine contact.** Migration, store, CRUD and versioning, code editor UI, tests. Needs approval to apply the migration.
2. **C2 — Remotion adapter** (`CustomCode`), default-off. Server-side env: `REMOTION_ENABLED`, `REMOTION_BASE_URL`, `REMOTION_ACCESS_CODE`.
3. **C3 — HyperFrames adapter**, default-off. Server-side env: `HYPERFRAMES_ENABLED`, `HYPERFRAMES_BASE_URL`, `HYPERFRAMES_API_KEY`. Requires explicit approval for legacy repo commits (see below).
4. **C4 — Output and status.** Polling reconciliation (same pattern as Suara), authenticated video proxy, Job Center preview/download. Optional later: copy finished MP4s into Studio R2 so outputs survive provider retention.
5. **C5 — Acceptance.** One small, owner-approved render per engine, then record evidence in `HANDOFF.md`.

## Approvals required before each risky step

- Applying the C1 migration.
- Setting provider secrets on the Studio Worker (owner sets them through a secure path; they are never in chat or Git).
- Any real render: it dispatches a legacy GitHub Actions workflow and writes legacy R2/KV.
- HyperFrames `html` renders: each one commits to `harvey-moeid/hyperframes`. If this is not approved, only pre-existing composition ids can be rendered.
- Any production deploy.

## Open questions

- Which engine first (recommended: Remotion `CustomCode`, because it does not commit to a legacy repo).
- Whether finished MP4s should be copied into Studio R2 (cost and retention) or only proxied.
- Whether composition source should also be exportable to the legacy repos (default: no).
