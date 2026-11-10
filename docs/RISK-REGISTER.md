# BYGA AI Studio — Risk Register

**Date:** 2026-11-10  
**Scope:** risks identified during Phase 0 source and configuration inspection.

| ID | Severity | Risk | Evidence / impact | Required mitigation | Status |
|---|---|---|---|---|---|
| R-01 | Critical | Suara pretrained model weights are CC-BY-NC | Official OmniVoice model card distinguishes Apache-2.0 code from CC-BY-NC weights; commercial audio generation may violate terms | Replace with a commercially compatible model or obtain explicit rights; review tokenizer terms and attribution | Open — commercial use blocked |
| R-02 | High | Remotion submit endpoint lacks application authentication | `POST /api/render` handler has no session/auth check; CORS is not access control; public callers can consume quota and runner time | Require Studio auth, per-project authorization, rate limits, abuse controls and safe quotas before routing requests | Open |
| R-03 | High | Provider output/status routes are public | HyperFrames status/video, Remotion status/files/thumbs and Suara audio routes have public handler access (Suara audio is protected by shared passcode) | Keep provider URLs server-side; authorize every Studio job/asset read; proxy or issue controlled access links | Open |
| R-04 | High | No common idempotency contract | All three render/voice submit handlers generate job IDs without accepting a common idempotency key; blind retry can create duplicate paid/CPU work | Persist submit attempt state; use deterministic request fingerprints and reconciliation; never auto-retry ambiguous POST | Open |
| R-05 | High | Legacy workflow dispatch mutates legacy operational state | Submit calls trigger repository_dispatch/workflow_dispatch and write job/output data into legacy R2/KV/D1 | Require explicit approval for each test/operation; adapters remain disabled; do not run live render tests under current scope | Blocked by authorization |
| R-06 | High | HyperFrames asset/HTML routes commit to legacy repository | `POST /asset` and `POST /render` with `html` call GitHub Contents API | Do not expose these features without separate approval and a narrowly scoped design; use existing compositions only after dispatch approval | Blocked by authorization |
| R-07 | High | MCPNEW OAuth/client onboarding not tested | MCP endpoint uses OAuth provider, dynamic registration and GitHub scope `repo read:user workflow`; tool set includes writes/destructive operations | Implement proper MCP client/OAuth, per-action authorization and confirmation; never reuse ChatGPT connector token | Open |
| R-08 | Medium | Remotion quota counter may overshoot under concurrency | Worker reads KV count then writes increment; read-modify-write is not atomic | Add Studio-side concurrency/quota reservation; consider provider-side correction only with separate legacy approval | Open |
| R-09 | Medium | Suara shared passcode is not project-level identity | All public API job/audio routes rely on a shared `x-passcode` | Store passcode only server-side; enforce project ownership in Studio; never send passcode to browser | Open |
| R-10 | Medium | Cancellation is not uniformly supported | Remotion supports cancel; HyperFrames and Suara inspected handlers expose no cancel route | UI must advertise cancel only for Remotion; other engines show truthful non-cancellable state | Open |
| R-11 | Medium | HyperFrames deployed base URL is unresolved | Worker config enables workers.dev but does not declare custom domain; account inventory confirms script only | Verify exact hostname from deployed Worker settings before creating adapter config | Open |
| R-12 | Medium | Remotion licensing depends on organization eligibility | Official license provides free use for eligible individuals and entities up to three employees; other organizations may require Company License | Confirm legal entity and current terms before commercial use | Open |
| R-13 | Medium | Repository-specific licenses are missing | Root LICENSE fetch returned not found for MCPNEW, Remotion fork and Suara | Clarify ownership/permission before redistribution or external derivative distribution | Open |
| R-14 | Low | Studio has no Cloudflare production resource yet | Read-only inventory found no Pages project or Worker named `byga-ai-studio` | Provision only after architecture, account mapping and explicit production deployment approval | Informational |

## Release blockers

Do not enable production adapters while R-01, R-02, R-03, R-05, R-07 or R-11 remain unresolved. R-12 and R-13 must be resolved for the intended commercial/distribution model.

## Operating rule

This register is not permission to change legacy systems. Any mitigation that requires a legacy code, secret, database, bucket, KV, workflow, domain or deployment change requires separate explicit approval.
