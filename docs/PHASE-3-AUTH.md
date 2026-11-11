# Phase 3 — Authentication decision (ADR)

**Status:** Authentication foundation implemented and merged in PR #5; not deployed or production-accepted. The decision resolves the authentication/user-model question for the **single-operator case only**.

## Decision

One operator, one server-side secret.

- The Worker reads `STUDIO_ACCESS_TOKEN` (minimum 32 characters). If it is missing or shorter, every protected route returns `503 AUTH_NOT_CONFIGURED` (fail closed).
- Public routes: `GET /api/v1/health`, `GET /api/v1/auth/session`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`. Everything else under `/api/v1/*` requires credentials, including unknown paths.
- Two accepted credentials:
  1. `Authorization: Bearer <token>` for scripts and tests.
  2. A session cookie issued by `POST /api/v1/auth/login` for the browser UI.
- Token comparison uses fixed-length HMAC values and a constant-time byte comparison.

## Session cookie

- Name `__Host-byga_session`; `HttpOnly; Secure; SameSite=Strict; Path=/`; 8-hour lifetime.
- Value `<expiry>.<HMAC-SHA256(token, expiry)>`. Stateless; nothing is stored. The token never reaches the browser after login.
- Rotating `STUDIO_ACCESS_TOKEN` invalidates every session.
- CSRF: cookie-authenticated unsafe methods (POST/PATCH/DELETE) additionally require `Sec-Fetch-Site: same-origin`. Bearer requests are not cookie-ambient, so they are exempt.
- Failed logins are throttled to 5 per minute per `CF-Connecting-IP` using in-memory, per-isolate state.

## Known limits (not hidden)

- **No user model, no roles, no per-user data separation.** Anyone holding the token is the operator. This is not multi-user.
- Logout clears the cookie in the browser but cannot revoke a copied cookie before expiry (stateless). Rotate the token to revoke.
- Throttle is volatile and per isolate; it is a speed bump, not a distributed rate limiter. A Cloudflare edge rate-limit control or equivalent distributed limiter is required before public exposure.
- `Sec-Fetch-Site` is required for cookie writes; clients that do not send it will be refused. Use the bearer path for non-browser clients.
- The cookie is Secure. Local HTTP behavior varies by browser; validate on the actual HTTPS origin before production acceptance.
- D1 schema is now applied remotely, but no Worker deployment/runtime binding verification has occurred. Authentication does not imply production readiness.

## Operator setup

Local development: put `STUDIO_ACCESS_TOKEN=<random value, 32+ chars>` in `apps/api/.dev.vars` (git-ignored). Generate one with `openssl rand -base64 36`.

Production: configure `STUDIO_ACCESS_TOKEN` as a Worker secret only through an approved secure secret-management path. The value must never be committed, pasted into chat, printed in logs, or placed in frontend code. At the time of this ADR refresh, the secret has **not** been independently verified as configured. No secret mutation or deployment is included in this documentation change.

## Tests

`apps/api/src/app.test.ts` covers: public health, 401 on missing/wrong bearer, 503 fail-closed (missing and short token), login success/failure, cookie attributes, CSRF metadata, tampered/expired/foreign-signed cookies, throttling and logout. These are application tests, not manual browser acceptance.
