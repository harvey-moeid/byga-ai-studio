# Phase 4 — Unified Creation Workflows

**Branch:** `feat/phase-4-unified-workflows`  
**Scope of this delivery:** first usable creation workflow slice (4.1); no production deployment.

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

- [x] Dedicated APAC R2 bucket `byga-ai-studio-assets` created; Worker binding `R2_ASSETS` added to production config and isolated staging config.
- [x] Authenticated multipart upload, 25 MiB limit, MIME allowlist, safe names, SHA-256, project-scoped keys, D1 metadata, authenticated download and delete lifecycle implemented.
- [x] Separate staging Worker and D1 database configured; production deployment and migration remain owner-gated.
- [ ] Run staging deployment, migration and live upload/download acceptance.

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
- [ ] CI must pass on the final branch head before PR merge.

## Safety and deployment

- No provider video dispatch, legacy repository mutation, R2 write, secret change, migration apply or production deployment was performed.
- Video creation is explicitly simulation-only until HyperFrames/Remotion runtime contracts and credentials are verified.
- Suara remains opt-in and personal/non-commercial only; voice cloning requires explicit permission.
- Production deploy remains separately gated by owner approval and outstanding Phase 3 auth/runtime checks.