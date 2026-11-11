# Suara adapter — personal, non-commercial integration

**Status:** Implemented behind an explicit server-side feature flag; not deployed or runtime-accepted.

## Scope and boundaries

- Studio connects to the existing `harvey-moeid/suara` Worker API over HTTPS.
- The Suara repository, its CPU runner, model weights, tokenizer, D1, R2 and GitHub Actions remain independent. This PR does not modify or copy any of them.
- The Studio Worker never runs OmniVoice inference. Suara's existing GitHub Actions CPU runner performs the render.
- Audio bytes remain in Suara R2. Studio streams MP3/WAV through an authenticated API proxy; it does not copy audio into Studio D1 or R2.
- D1 stores the Studio job, input metadata and Suara provider job ID using the existing `provider_job_id` column. No schema migration is required.
- Use is scoped to the owner's personal, non-commercial workspace. Do not resell, sublicense, expose as a public generation service, or use this integration for commercial production without separately clearing all upstream rights.

## Upstream license notes

- The [official OmniVoice model card](https://huggingface.co/k2-fsa/OmniVoice) says its inference code is Apache-2.0, while its pretrained model weights are CC-BY-NC due to training-data constraints. The card does not specify a CC-BY-NC version.
- The model repository includes `audio_tokenizer/LICENSE`, a separate Boson Higgs Audio 2 Community License Agreement based on the Meta Llama 3 Community License. Those terms are not replaced by the OmniVoice code license or the weights' CC-BY-NC label.
- This project does not redistribute either weights or tokenizer. The Suara runner downloads and uses them as part of the existing private/personal generation workflow. The operator remains responsible for reviewing and accepting applicable upstream terms and attribution/acceptable-use requirements.
- No claim is made here about ownership or unrestricted downstream rights in generated audio.
- Voice cloning requires permission from the speaker. The API requires explicit consent and an uploaded reference audio file.

## Server configuration (not set by this PR)

Configure the Studio Worker only through the approved Cloudflare secret/variable workflow:

| Name | Type | Purpose |
| --- | --- | --- |
| `SUARA_ENABLED` | Variable | Must be exactly `true`; absent/false disables all provider calls. |
| `SUARA_BASE_URL` | Variable | HTTPS origin of the deployed Suara Worker, without credentials/query/hash. |
| `SUARA_APP_PASSCODE` | Secret | Existing Suara `APP_PASSCODE`; never expose it to browser code or commit it. |

The adapter refuses non-HTTPS URLs. Do not put the passcode in `wrangler.jsonc`, GitHub source, a browser bundle, a query string, or logs. The base URL should be confirmed from the deployed Suara Worker before enabling the feature.

This PR does not create/update any Cloudflare secret, variable, route, domain or deployment. Feature flag remains off until a separately approved configuration/deploy.

## API contract

- `GET /api/v1/engines`: checks protected Suara `/api/meta` (passcode + D1 path). `configured` means this check passed; it does not prove the CPU runner is online or that a render will succeed.
- `POST /api/v1/suara/jobs`: accepts multipart form data, validates text (1,500 chars), mode, language, steps, speed, reference size (10 MiB) and clone consent; persists a Studio job and submits one provider request.
- `GET /api/v1/jobs` and `GET /api/v1/jobs/:id`: reconcile non-terminal Suara jobs against the provider status.
- `GET /api/v1/jobs/:id/audio?format=mp3|wav`: requires an authenticated Studio session and a succeeded Suara job, then streams audio from Suara without exposing its passcode.

Provider submission is intentionally not retried: Suara has no idempotency key, so retrying after a timeout could create duplicate render jobs. An ambiguous failure should be checked in Suara's job history before resubmitting.

## Supported workflow

- Auto voice, voice design and consent-gated voice clone.
- Indonesian is the default language; language IDs accepted by the model may be supplied.
- 8/16/32 steps and speed 0.5–2.
- MP3 playback and WAV download.
- Provider jobs are asynchronous. The UI refreshes job status while Suara jobs remain active.

Suara's current API limits remain authoritative: max 1,500 text characters, max 10 MiB reference audio, max 20 jobs/day (WIB), one render at a time, and seven-day retention. The runner may take minutes on CPU; do not treat job submission as completed audio.

## Verification boundaries

Automated tests cover adapter URL validation, disabled-by-default behavior, protected metadata health, multipart submit, provider status mapping, consent gating, status reconciliation and audio proxy streaming with mocked HTTP responses.

These tests do not prove:
- the current Suara Worker URL, `APP_PASSCODE`, GitHub dispatch token or runner secrets are configured;
- a live CPU render completes;
- generated MP3/WAV quality or browser playback on the deployed origin;
- upstream licensing terms grant any commercial or redistribution rights.

## Acceptance checklist

- [ ] Confirm the Suara Worker origin from its Cloudflare deployment.
- [ ] Confirm Suara's protected `/api/meta` succeeds with the configured passcode.
- [ ] Configure Studio variables/secrets through an approved secure path.
- [ ] Deploy Studio only after explicit production deployment approval.
- [ ] Run one short personal non-commercial TTS smoke test; verify job state, MP3 playback, WAV download, and seven-day cleanup behavior.
- [ ] Keep clone tests restricted to a voice the operator is authorized to use.
