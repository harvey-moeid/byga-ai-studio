// Single-operator authentication primitives (Web Crypto only; runs on Workers and Node).
// Credential: one server-side secret (STUDIO_ACCESS_TOKEN). No user model, no persistence.
import type { Bindings } from './env';

const encoder = new TextEncoder();

export const SESSION_COOKIE = '__Host-byga_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const MIN_TOKEN_LENGTH = 32;

/** Returns the configured token, or null when missing/too short (auth then fails closed). */
export function configuredToken(env: Bindings | undefined): string | null {
  const token = env?.STUDIO_ACCESS_TOKEN;
  return typeof token === 'string' && token.length >= MIN_TOKEN_LENGTH ? token : null;
}

async function hmac(key: string, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data)));
}

const toHex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Constant-time comparison: both sides are reduced to fixed-length HMACs first. */
export async function tokenMatches(candidate: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([hmac('byga-compare', candidate), hmac('byga-compare', expected)]);
  return bytesEqual(a, b);
}

/** Stateless session: `<expiryEpochSeconds>.<hmac(token, expiry)>`. Rotating the token revokes all sessions. */
export async function issueSession(token: string, nowMs = Date.now()): Promise<{ value: string; exp: number }> {
  const exp = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const signature = toHex(await hmac(token, 'byga-session:' + exp));
  return { value: exp + '.' + signature, exp };
}

/** Returns the session expiry (epoch seconds) when the cookie value is valid and unexpired, otherwise null. */
export async function verifySession(value: string | undefined, token: string, nowMs = Date.now()): Promise<number | null> {
  if (!value) return null;
  const dot = value.indexOf('.');
  if (dot < 1) return null;
  const expText = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!/^\d{1,12}$/.test(expText)) return null;
  const exp = Number(expText);
  if (exp * 1000 <= nowMs) return null;
  const expected = toHex(await hmac(token, 'byga-session:' + expText));
  return (await tokenMatches(signature, expected)) ? exp : null;
}

// Failed-login throttle. Volatile and per-isolate: a speed bump, not a distributed rate limiter.
const MAX_FAILURES = 5;
const WINDOW_MS = 60_000;
const failures = new Map<string, { count: number; resetAt: number }>();

/** Seconds the caller must wait, or 0 when attempts are allowed. */
export function throttleWait(key: string, nowMs = Date.now()): number {
  const entry = failures.get(key);
  if (!entry) return 0;
  if (entry.resetAt <= nowMs) {
    failures.delete(key);
    return 0;
  }
  return entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - nowMs) / 1000) : 0;
}

export function recordFailure(key: string, nowMs = Date.now()): void {
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= nowMs) failures.set(key, { count: 1, resetAt: nowMs + WINDOW_MS });
  else entry.count += 1;
  if (failures.size > 1000) {
    for (const [k, v] of failures) if (v.resetAt <= nowMs) failures.delete(k);
  }
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
