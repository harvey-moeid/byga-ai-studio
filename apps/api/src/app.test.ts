import { describe, expect, it } from 'vitest';
import { app } from './app';

describe('Studio API foundation', () => {
  it('returns a validated health response', async () => {
    const response = await app.request('/api/v1/health');
    const body = await response.json() as { service: string; status: string; version: string };
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ service: 'byga-ai-studio-api', status: 'ok', version: '0.1.0' });
    expect(response.headers.get('x-request-id')).toMatch(/^req_/);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('returns a structured 404 for unknown API routes', async () => {
    const response = await app.request('/api/v1/unknown');
    const body = await response.json() as { error: { code: string; requestId: string } };
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toMatch(/^req_/);
  });
});
