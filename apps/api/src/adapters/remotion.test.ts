import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdapterDisabledError, RemotionAdapter } from './remotion';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * Mimics real fetch: headers resolve immediately, the body starts streaming and then stalls forever.
 * The body stream errors only when the request's AbortSignal fires, as a real network body would.
 */
const stalledBodyResponse = (init: RequestInit | undefined, status = 200) => {
  const signal = init?.signal;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"jobId":'));
      signal?.addEventListener('abort', () => controller.error(new DOMException('The operation was aborted.', 'AbortError')), { once: true });
    }
  });
  return new Response(body, { status, headers: { 'content-type': 'application/json' } });
};

const stalledBodyFetcher = (status = 200) =>
  vi.fn<typeof fetch>().mockImplementation(async (_input, init) => stalledBodyResponse(init, status));

describe('Remotion adapter foundation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is disabled by default and performs no network request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const adapter = new RemotionAdapter({ fetcher });
    expect(await adapter.healthCheck()).toEqual({ status: 'disabled', reason: 'feature-flag-off' });
    await expect(adapter.getJob('job_123')).rejects.toBeInstanceOf(AdapterDisabledError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('reports missing base URL without network I/O', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const adapter = new RemotionAdapter({ enabled: true, fetcher });
    expect(await adapter.healthCheck()).toEqual({ status: 'unconfigured', reason: 'base-url-missing' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('submits once and returns the provider job id', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ jobId: 'remotion_123' }, 202));
    const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid/', fetcher });
    await expect(adapter.submitJob({ template: 'Intro', ratio: '9:16' })).resolves.toEqual({ providerJobId: 'remotion_123' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://fixture.invalid/api/render');
  });

  it('does not retry a submit after an ambiguous server error', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ error: 'unavailable' }, 503));
    const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher, readRetries: 2 });
    await expect(adapter.submitJob({ template: 'Intro', ratio: '9:16' })).rejects.toMatchObject({ status: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retries a failed read within the configured bound', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ error: 'temporary' }, 503))
      .mockResolvedValueOnce(response({ jobId: 'remotion_123', status: 'rendering' }));
    const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher, readRetries: 1 });
    await expect(adapter.getJob('remotion_123')).resolves.toMatchObject({ status: 'rendering' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('validates provider job identifiers before building paths', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher });
    await expect(adapter.getJob('../secrets')).rejects.toThrow('Invalid Remotion job identifier.');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not retry cancellation', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ error: 'busy' }, 503));
    const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher, readRetries: 2 });
    await expect(adapter.cancelJob('remotion_123')).rejects.toMatchObject({ status: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  describe('response body timeout (P2 regression)', () => {
    it('aborts a submit whose response body stalls after headers, without retrying', async () => {
      vi.useFakeTimers();
      const fetcher = stalledBodyFetcher(202);
      const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher, timeoutMs: 1000, readRetries: 2 });
      const outcome = expect(adapter.submitJob({ template: 'Intro', ratio: '9:16' })).rejects.toMatchObject({ name: 'AbortError' });
      await vi.advanceTimersByTimeAsync(1000);
      await outcome;
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('aborts a getJob whose response body stalls and does not retry when readRetries is 0', async () => {
      vi.useFakeTimers();
      const fetcher = stalledBodyFetcher();
      const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher, timeoutMs: 1000, readRetries: 0 });
      const outcome = expect(adapter.getJob('remotion_123')).rejects.toMatchObject({ name: 'AbortError' });
      await vi.advanceTimersByTimeAsync(1000);
      await outcome;
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('retries a stalled getJob body only within the configured bound', async () => {
      vi.useFakeTimers();
      const fetcher = stalledBodyFetcher();
      const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher, timeoutMs: 1000, readRetries: 1 });
      const outcome = expect(adapter.getJob('remotion_123')).rejects.toMatchObject({ name: 'AbortError' });
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      await outcome;
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('keeps the timeout active while reading the body of an error response', async () => {
      vi.useFakeTimers();
      const fetcher = stalledBodyFetcher(503);
      const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher, timeoutMs: 1000, readRetries: 2 });
      const outcome = expect(adapter.submitJob({ template: 'Intro', ratio: '9:16' })).rejects.toMatchObject({ status: 503 });
      await vi.advanceTimersByTimeAsync(1000);
      await outcome;
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('clears the timer after successful submit, getJob and cancel', async () => {
      vi.useFakeTimers();
      const fetcher = vi.fn<typeof fetch>()
        .mockImplementationOnce(async () => response({ jobId: 'remotion_123' }, 202))
        .mockImplementationOnce(async () => response({ jobId: 'remotion_123', status: 'rendering' }))
        .mockImplementationOnce(async () => response({ ok: true }));
      const adapter = new RemotionAdapter({ enabled: true, baseUrl: 'https://fixture.invalid', fetcher });
      await adapter.submitJob({ template: 'Intro', ratio: '9:16' });
      expect(vi.getTimerCount()).toBe(0);
      await adapter.getJob('remotion_123');
      expect(vi.getTimerCount()).toBe(0);
      await adapter.cancelJob('remotion_123');
      expect(vi.getTimerCount()).toBe(0);
      expect(fetcher).toHaveBeenCalledTimes(3);
    });
  });
});
