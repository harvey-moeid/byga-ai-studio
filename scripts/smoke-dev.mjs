// Repeatable local smoke test: Vite (5173) -> /api proxy -> Wrangler dev (8787).
// Usage: npm run smoke:dev   (requires `npm run build --workspace=@byga/web` once for Wrangler assets)
import { spawn } from 'node:child_process';

const WEB = 'http://127.0.0.1:5173';
const API = 'http://127.0.0.1:8787';
const TIMEOUT_MS = 90_000;

const children = [];
const out = (line) => process.stdout.write(`${line}\n`);

function start(script) {
  const child = spawn('npm', ['run', script], { stdio: 'ignore', detached: true });
  children.push(child);
}

function stopAll() {
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* already exited */
    }
  }
}

async function waitFor(url, label) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} not ready within ${TIMEOUT_MS / 1000}s (${url})`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  out(`ok - ${message}`);
}

async function main() {
  start('dev:api');
  start('dev');
  await waitFor(`${API}/api/v1/health`, 'Wrangler dev');
  await waitFor(`${WEB}/`, 'Vite dev');

  const response = await fetch(`${WEB}/api/v1/health`, { headers: { accept: 'application/json' } });
  assert(response.status === 200, 'GET /api/v1/health via Vite returns 200');
  assert((response.headers.get('content-type') ?? '').includes('application/json'), 'response is JSON, not the SPA HTML');
  assert(Boolean(response.headers.get('x-request-id')), 'response carries x-request-id from the Worker');

  const body = await response.json();
  assert(body.status === 'ok', 'health status is "ok"');
  assert(body.service === 'byga-ai-studio-api', 'service name matches Studio API');
  assert(typeof body.version === 'string' && body.version.length > 0, 'version is present');
  assert(!Number.isNaN(Date.parse(body.checkedAt)), 'checkedAt is a valid timestamp');
  out('SMOKE PASSED');
}

main()
  .catch((error) => {
    process.stderr.write(`SMOKE FAILED: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(stopAll);
