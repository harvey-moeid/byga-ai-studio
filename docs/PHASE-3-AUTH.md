# Phase 3 — Authentication decision (ADR)

**Status:** implemented on `feat/phase-3-auth`; not deployed. Resolves the "Authentication/user model" open decision **for the single-operator case only**.

## Decision

One operator, one server-side secret.

- The Worker reads `STUDIO_ACCESS_TOKEN` (minimum 32 characters). If it is missing or shorter, every protected route returns `503 AUTH_NOT_CONFIGURED` (fail closed).
- Public routes: `GET /api/v1/health`, `GET /api/v1/auth/session`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`. Everything else under `/api/v1/*` requires credentials, including unknown paths.
- Two accepted credentials:
  1. `Authorization: Bearer <token>` for scripts and tests.
  2. A session cookie issued by `POST /api/v1/auth/login` for the browser UI.
- Token comparison is constant-time (both sides reduced to fixed-length HMACs).

## Session cookie

- Name `__Host-byga_session`; `HttpOnly; Secure; SameSite=Strict; Path=/`; 8 hour lifetime.
- Value `<expiry>.<HMAC-SHA256(token, expiry)>`. Stateless; nothing is stored. The token never reaches the browser after login.
- Rotating `STUDIO_ACCESS_TOKEN` invalidates every session.
- CSRF: cookie-authenticated unsafe methods (POST/PATCH/DELETE) additionally require `Sec-Fetch-Site: same-origin`. Bearer requests are not cookie-ambient, so they are exempt.
- Failed logins are throttled to 5 per minute per `CF-Connecting-IP` (in-memory, per isolate).

## Known limits (not hidden)

- **No user model, no roles, no per-user data separation.** Anyone holding the token is the operator. This is not multi-user.
- Logout clears the cookie in the browser but cannot revoke a copied cookie before expiry (stateless). Rotate the token to revoke.
- Throttle is volatile and per isolate; it is a speed bump, not a distributed rate limiter. Put Cloudflare rate limiting in front before public exposure.
- `Sec-Fetch-Site` is required for cookie writes; very old browsers that do not send it will be refused. Use the bearer path instead.
- Over plain `http://` the `Secure` cookie is only accepted by browsers that treat localhost as secure (current Chrome/Firefox). Safari may not keep it in local dev.
- Persistence is still undecided; all data remains in Worker memory.

## Operator setup (requires explicit approval; not performed here)

Local development: put `STUDIO_ACCESS_TOKEN=<random value, 32+ chars>` in `apps/api/.dev.vars` (git-ignored). Generate one with `openssl rand -base64 36`.

Production: `wrangler secret put STUDIO_ACCESS_TOKEN` against the intended Worker. This changes a Cloudflare resource and must not be done without approval; no deployment or secret change was made in this phase.

## Tests

`apps/api/src/app.test.ts` covers: public health, 401 on missing/wrong bearer, 503 fail-closed (missing and short token), login success/failure, cookie attributes, CSRF metadata, tampered/expired/foreign-signed cookies, throttling and logout.
