import { describe, expect, it, vi } from 'vitest';
import { AdapterDisabledError, RemotionAdapter } from './remotion';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('Remotion adapter foundation', () => {
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
    await expect(adapter.submitJob({ jobId: 'local_1', template: 'Intro', ratio: '9:16' })).rejects.toMatchObject({ status: 503 });
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
});