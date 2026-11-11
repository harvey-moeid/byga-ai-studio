export type AdapterHealth =
  | { status: 'disabled'; reason: 'feature-flag-off' }
  | { status: 'unconfigured'; reason: 'base-url-missing' }
  | { status: 'reachable'; checkedAt: string; httpStatus: number }
  | { status: 'unreachable'; checkedAt: string; reason: string };

export type RemotionJob = {
  jobId: string;
  template: string;
  ratio: '9:16' | '16:9';
  props?: Record<string, unknown>;
};

export type RemotionJobStatus = {
  jobId: string;
  status: string;
  videoUrl?: string;
  thumbUrl?: string;
  [key: string]: unknown;
};

export type RemotionAdapterOptions = {
  /** Must be explicitly true; the default is disabled and performs no network I/O. */
  enabled?: boolean;
  /** Supply only after the deployed hostname has been independently verified. */
  baseUrl?: string;
  timeoutMs?: number;
  readRetries?: number;
  fetcher?: typeof fetch;
};

export class AdapterDisabledError extends Error {
  constructor() { super('Remotion adapter is disabled.'); this.name = 'AdapterDisabledError'; }
}
export class AdapterConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = 'AdapterConfigurationError'; }
}
export class AdapterHttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); this.name = 'AdapterHttpError'; }
}

const bounded = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.floor(value)));
const safeMessage = (body: unknown) => {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error.slice(0, 300);
  return 'Remotion request failed.';
};

export class RemotionAdapter {
  private readonly enabled: boolean;
  private readonly baseUrl?: string;
  private readonly timeoutMs: number;
  private readonly readRetries: number;
  private readonly fetcher: typeof fetch;

  constructor(options: RemotionAdapterOptions = {}) {
    this.enabled = options.enabled === true;
    this.baseUrl = options.baseUrl?.replace(/\/+$/, '');
    this.timeoutMs = bounded(options.timeoutMs ?? 8000, 1000, 30000);
    this.readRetries = bounded(options.readRetries ?? 1, 0, 2);
    this.fetcher = options.fetcher ?? fetch;
  }

  private assertEnabled() {
    if (!this.enabled) throw new AdapterDisabledError();
    if (!this.baseUrl) throw new AdapterConfigurationError('Remotion base URL is not configured.');
  }

  private async request(path: string, init: RequestInit = {}, retryRead = false): Promise<Response> {
    this.assertEnabled();
    const attempts = retryRead ? this.readRetries + 1 : 1;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, signal: controller.signal });
        if (retryRead && response.status >= 500 && attempt + 1 < attempts) continue;
        if (!response.ok) throw new AdapterHttpError(response.status, safeMessage(await response.clone().json().catch(() => null)));
        return response;
      } catch (error) {
        lastError = error;
        if (error instanceof AdapterHttpError && error.status < 500) throw error;
        if (attempt + 1 >= attempts) throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Remotion request failed.');
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (!this.enabled) return { status: 'disabled', reason: 'feature-flag-off' };
    if (!this.baseUrl) return { status: 'unconfigured', reason: 'base-url-missing' };
    const checkedAt = new Date().toISOString();
    try {
      const response = await this.request('/', { method: 'GET' }, true);
      return { status: 'reachable', checkedAt, httpStatus: response.status };
    } catch (error) {
      return { status: 'unreachable', checkedAt, reason: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /** Submit is deliberately single-attempt: the provider has no idempotency contract. */
  async submitJob(job: RemotionJob): Promise<{ providerJobId: string }> {
    const response = await this.request('/api/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(job)
    });
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('jobId' in body) || typeof body.jobId !== 'string' || !body.jobId) {
      throw new AdapterConfigurationError('Remotion returned an invalid submit response.');
    }
    return { providerJobId: body.jobId };
  }

  async getJob(providerJobId: string): Promise<RemotionJobStatus> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(providerJobId)) throw new AdapterConfigurationError('Invalid Remotion job identifier.');
    const response = await this.request(`/api/jobs/${encodeURIComponent(providerJobId)}`, { method: 'GET' }, true);
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('jobId' in body) || typeof body.jobId !== 'string' || !('status' in body) || typeof body.status !== 'string') {
      throw new AdapterConfigurationError('Remotion returned an invalid job response.');
    }
    return body as RemotionJobStatus;
  }

  /** Cancellation is single-attempt; do not replay a mutating request after an ambiguous timeout. */
  async cancelJob(providerJobId: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(providerJobId)) throw new AdapterConfigurationError('Invalid Remotion job identifier.');
    await this.request(`/api/jobs/${encodeURIComponent(providerJobId)}/cancel`, { method: 'POST' });
  }
}
