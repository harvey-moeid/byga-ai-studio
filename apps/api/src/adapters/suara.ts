export type SuaraMode = 'auto' | 'clone' | 'design';
export type SuaraJobStatus = 'queued' | 'running' | 'done' | 'failed';

export type SuaraSubmission = {
  text: string;
  mode: SuaraMode;
  language: string;
  numStep: 8 | 16 | 32;
  speed: number;
  instruct?: string;
  refText?: string;
  consent?: boolean;
  ref?: File;
};

export type SuaraJob = {
  id: string;
  status: SuaraJobStatus;
  mode: SuaraMode;
  progress: { done: number; total: number };
  error: string | null;
  audioSec: number | null;
  elapsedSec: number | null;
  rtf: number | null;
};

export type SuaraAdapterOptions = {
  enabled?: boolean;
  baseUrl?: string;
  passcode?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

export type SuaraHealth =
  | { status: 'disabled'; reason: 'feature-flag-off' | 'configuration-missing' }
  | { status: 'configured'; checkedAt: string }
  | { status: 'unreachable'; checkedAt: string; reason: string };

export class SuaraAdapterError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'SuaraAdapterError';
  }
}

const clampTimeout = (n: number) => Math.min(30000, Math.max(1000, Math.floor(n)));
const safeError = (body: unknown) =>
  body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    ? body.error.slice(0, 240)
    : 'Suara request failed.';

export class SuaraAdapter {
  private readonly enabled: boolean;
  private readonly baseUrl: string | undefined;
  private readonly passcode: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;

  constructor(options: SuaraAdapterOptions = {}) {
    this.enabled = options.enabled === true;
    this.passcode = options.passcode?.trim() || undefined;
    this.timeoutMs = clampTimeout(options.timeoutMs ?? 10000);
    this.fetcher = options.fetcher ?? fetch;
    const raw = options.baseUrl?.trim();
    if (raw) {
      try {
        const url = new URL(raw);
        if (url.protocol === 'https:' && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash) {
          this.baseUrl = url.toString().replace(/\/+$/, '');
        }
      } catch {
        // Invalid provider URLs remain unconfigured and never trigger network I/O.
      }
    }
  }

  get configured(): boolean {
    return this.enabled && Boolean(this.baseUrl && this.passcode);
  }

  private assertConfigured(): string {
    if (!this.enabled) throw new SuaraAdapterError(503, 'Suara integration is disabled.');
    if (!this.baseUrl || !this.passcode) throw new SuaraAdapterError(503, 'Suara integration is not configured.');
    return this.baseUrl;
  }

  private async json<T>(path: string, init: RequestInit = {}): Promise<T> {
    const base = this.assertConfigured();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = new Headers(init.headers);
      headers.set('x-passcode', this.passcode!);
      headers.set('accept', 'application/json');
      const response = await this.fetcher(base + path, { ...init, headers, signal: controller.signal });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new SuaraAdapterError(response.status, safeError(body));
      return body as T;
    } catch (error) {
      if (error instanceof SuaraAdapterError) throw error;
      throw new SuaraAdapterError(502, error instanceof Error && error.name === 'AbortError' ? 'Suara request timed out.' : 'Suara is unreachable.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthCheck(): Promise<SuaraHealth> {
    if (!this.enabled) return { status: 'disabled', reason: 'feature-flag-off' };
    if (!this.baseUrl || !this.passcode) return { status: 'disabled', reason: 'configuration-missing' };
    const checkedAt = new Date().toISOString();
    try {
      // /api/meta is protected and reads D1, so this checks URL, passcode and the Suara API's D1 path.
      const meta = await this.json<{ quotaUsed?: unknown; quotaMax?: unknown; maxChars?: unknown; rtfByStep?: unknown }>('/api/meta');
      if (typeof meta.quotaUsed !== 'number' || typeof meta.quotaMax !== 'number' || typeof meta.maxChars !== 'number' || !meta.rtfByStep || typeof meta.rtfByStep !== 'object') {
        throw new SuaraAdapterError(502, 'Suara returned invalid metadata.');
      }
      return { status: 'configured', checkedAt };
    } catch (error) {
      return { status: 'unreachable', checkedAt, reason: error instanceof SuaraAdapterError ? error.message : 'Suara is unreachable.' };
    }
  }

  async submitJob(input: SuaraSubmission): Promise<{ providerJobId: string }> {
    const form = new FormData();
    form.set('text', input.text);
    form.set('mode', input.mode);
    form.set('language', input.language);
    form.set('num_step', String(input.numStep));
    form.set('speed', String(input.speed));
    form.set('instruct', input.instruct ?? '');
    form.set('ref_text', input.refText ?? '');
    form.set('consent', input.consent ? 'true' : 'false');
    if (input.ref) form.set('ref', input.ref, input.ref.name || 'reference-audio');
    const body = await this.json<{ job_id?: unknown }>('/api/jobs', { method: 'POST', body: form });
    if (typeof body.job_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.job_id)) {
      throw new SuaraAdapterError(502, 'Suara returned an invalid job identifier.');
    }
    return { providerJobId: body.job_id };
  }

  async getJob(providerJobId: string): Promise<SuaraJob> {
    if (!/^[0-9a-f-]{36}$/i.test(providerJobId)) throw new SuaraAdapterError(400, 'Invalid Suara job identifier.');
    const body = await this.json<Record<string, unknown>>('/api/jobs/' + encodeURIComponent(providerJobId));
    const status = body.status;
    if (body.id !== providerJobId) throw new SuaraAdapterError(502, 'Suara returned a mismatched job identifier.');
    if (!['queued', 'running', 'done', 'failed'].includes(String(status))) {
      throw new SuaraAdapterError(502, 'Suara returned an invalid job status.');
    }
    const progress = body.progress && typeof body.progress === 'object' ? body.progress as Record<string, unknown> : {};
    const numeric = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
    return {
      id: providerJobId,
      status: status as SuaraJobStatus,
      mode: ['auto', 'clone', 'design'].includes(String(body.mode)) ? body.mode as SuaraMode : 'auto',
      progress: { done: numeric(progress.done) ?? 0, total: numeric(progress.total) ?? 0 },
      error: typeof body.error === 'string' ? body.error.slice(0, 300) : null,
      audioSec: numeric(body.audioSec),
      elapsedSec: numeric(body.elapsedSec),
      rtf: numeric(body.rtf)
    };
  }

  async getAudio(providerJobId: string, format: 'mp3' | 'wav'): Promise<Response> {
    const base = this.assertConfigured();
    if (!/^[0-9a-f-]{36}$/i.test(providerJobId)) throw new SuaraAdapterError(400, 'Invalid Suara job identifier.');
    const response = await this.fetcher(base + '/api/jobs/' + encodeURIComponent(providerJobId) + '/audio?fmt=' + format, {
      headers: { 'x-passcode': this.passcode!, accept: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' },
      signal: AbortSignal.timeout(120000)
    }).catch((error: unknown) => {
      throw new SuaraAdapterError(502, error instanceof Error && error.name === 'TimeoutError' ? 'Audio download timed out.' : 'Suara is unreachable.');
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new SuaraAdapterError(response.status, safeError(body));
    }
    return response;
  }
}
