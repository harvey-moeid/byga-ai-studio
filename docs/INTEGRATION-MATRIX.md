# Legacy Integration Matrix

Read-only discovery first. This document does not authorize writes to legacy repositories or infrastructure.

| System | Intended role | Prior observations | Contract status |
|---|---|---|---|
| MCPNEW | Tool connectivity/orchestration | Public origin previously observed as https://mcpnew.muidsoft.com; tool groups include GitHub, Cloudflare, files, skills and web. CI checks install/config, tests, typecheck, Wrangler dry-run, audit and secret scanning. | Partial; verify routes, auth, schemas and supported operations. |
| HyperFrames | HTML/CSS/GSAP video | cloudflare-free route previously observed with Worker hyperframes-render, R2 binding VIDEOS, dispatch event render-video; routes included /render, /asset, /video/:id, /status/:id. | Partial; verify workflow path, payload, auth, status and output lifecycle. |
| Remotion | React video rendering | Remotion 4.0.250 / React 18.3.1; Worker remotion-api, KV JOBS, R2 remotion-renders, workflow render.yml and Actions runner rendering. | Partial; verify API routes, dispatch payload, status and output URLs. |
| Suara | Audio/speech/voice | React/Vite frontend, Hono Worker, D1/R2 references and Actions CPU runner for generation were previously observed. | Partial; verify generation API, output persistence, job status, UI discovery and licenses. |

## Required evidence per system
- Repository and commit SHA inspected.
- Exact route/handler and HTTP method.
- Auth mechanism and token scopes.
- Request/response schemas and error cases.
- Job ID, state transitions, progress and cancellation support.
- Webhook signature or polling limits.
- Output storage, URL lifetime, access and MIME.
- Upload limits, MIME constraints and CORS.
- Rate limits, timeouts, retries and idempotency.
- Licensing/commercial-use restrictions.

## Confidence labels
Verified = direct source/API evidence inspected in current audit.  
Partial = prior observations exist but contract is not fully verified.  
Unknown = no reliable evidence.

All systems are currently Partial. No production adapter should be enabled from this matrix alone.

## Explicit no-touch list
harvey-moeid/mcpnew  
harvey-moeid/hyperframes  
harvey-moeid/remotion  
harvey-moeid/suara

No commits, PRs, issues, workflow dispatches, secret/config changes, resource mutations or deployments are permitted there without separate explicit approval.
