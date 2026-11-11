# Phase 4 — Unified Creation Workflows

**Status:** 4.1 and the code for 4.2 are merged to `main` (commit `5ec3616`). Production-only: there is no staging or preview environment.

## 4.1 Unified creation engine

- [x] One creation launcher available from the authenticated workspace.
- [x] Project-scoped creation with standardized audio/video form.
- [x] Video configuration: engine selection, title, brief, aspect ratio and quality.
- [x] Audio configuration: Suara TTS mode, language, steps, speed, text, voice design and consent-gated reference audio.
- [x] Client-side constraints plus server-side validation through existing Zod/API contracts.
- [x] Persist video simulation jobs through the existing job API and audio provider jobs through the existing Suara API.
- [x] Job visibility refreshed in the existing Job Center after submission.
- [x] Clear distinction between simulation and real provider execution.

## 4.2 Asset upload and storage

- [x] Dedicated APAC R2 bucket `byga-ai-studio-assets` created; Worker binding `R2_ASSETS` declared in `apps/api/wrangler.jsonc`.
- [x] Authenticated multipart upload, 25 MiB limit, MIME allowlist, safe names, SHA-256, project-scoped keys, D1 metadata, authenticated download and delete lifecycle implemented.
- [ ] Confirm via the `D1 migrations` workflow (`dry_run=true`) that no migration is pending on the production D1 database.
- [ ] Live upload/download/delete acceptance on production, after an owner-approved route or custom domain exists. Use a dedicated test project and delete test objects afterwards.

## 4.3 Job orchestration

- [x] Reuse persisted job lifecycle and state refresh for Suara.
- [ ] Unified progress reporting, retry policy and video provider orchestration require verified provider contracts and idempotency.
- [ ] Never automatically replay an ambiguous provider submission.

## 4.4 Output management

- [x] Existing Suara output audio preview (MP3) and WAV download remain available in Job Center and creation dialog.
- [ ] Video output preview/download waits for a verified render provider; simulated video jobs must not show fake media.

## 4.5 UX and acceptance

- [x] Responsive creation dialog and keyboard-operable labeled form controls.
- [x] Loading, validation and error states.
- [ ] Manual desktop/mobile screen-reader and keyboard acceptance remains outstanding.
- [x] CI passed on `main` after the Phase 4 merge (run #96).

## Safety and deployment

- Production only. No staging or preview Worker, D1 database or R2 bucket is used or planned.
- Video creation is simulation-only until HyperFrames/Remotion runtime contracts and credentials are verified.
- Suara remains opt-in and personal/non-commercial only; voice cloning requires explicit permission.
- Any new route/custom domain, secret change, migration apply or deployment remains owner-gated.
