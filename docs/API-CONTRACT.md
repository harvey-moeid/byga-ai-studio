# API Contract Register

No external engine contract is approved for production implementation yet. Earlier repository observations are not sufficient to guarantee a stable public API.

| Adapter | Base URL / mechanism | Auth | Submit schema | Status schema | Output retrieval | Readiness |
|---|---|---|---|---|---|---|
| MCPNEW | Pending route verification; origin previously observed as https://mcpnew.muidsoft.com | Pending | Pending | Pending | Pending | Not ready |
| HyperFrames | Worker/API and GitHub dispatch mechanism to verify | Pending | Pending | Pending | Pending | Not ready |
| Remotion | Worker/API and workflow render.yml previously observed | Pending | Pending | Pending | Pending | Not ready |
| Suara | Worker/API route to verify | Pending | Pending | Pending | Pending | Not ready |

## Required contract record
For each operation, record purpose; repository/commit/path/line evidence; HTTP method and exact path or event; authentication and scopes; request schema; response and errors; job ID/state/progress; webhook or polling behavior; output storage/access/expiration; timeouts/rate limits/file limits; idempotency; compatibility/versioning.

## Adapter approval gate
An adapter may be enabled only after direct source or authoritative API documentation supports its contract; runtime schemas validate input/output; auth is tested without exposing credentials; success/failure/timeout/duplicate cases pass; output retrieval and UI discovery are proven; and no legacy mutation is required (or separate approval exists).

Do not invent endpoint paths, payload keys, status values, tokens or output URL patterns.
