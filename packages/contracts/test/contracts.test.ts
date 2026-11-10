import { describe, expect, it } from 'vitest';
import { ApiErrorSchema, CreateProjectInputSchema, HealthResponseSchema, JobStateSchema } from '../src/index';

describe('shared contracts', () => {
  it('accepts a trimmed project name', () => {
    expect(CreateProjectInputSchema.parse({ name: '  Campaign  ' })).toEqual({ name: 'Campaign' });
  });

  it('rejects empty and oversized project names', () => {
    expect(CreateProjectInputSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(CreateProjectInputSchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false);
  });

  it('accepts only normalized job states', () => {
    expect(JobStateSchema.safeParse('running').success).toBe(true);
    expect(JobStateSchema.safeParse('rendering').success).toBe(false);
  });

  it('validates health and error response envelopes', () => {
    expect(HealthResponseSchema.safeParse({ service: 'byga-ai-studio-api', status: 'ok', version: '0.1.0', checkedAt: new Date().toISOString() }).success).toBe(true);
    expect(ApiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'Not found', requestId: 'req_123' } }).success).toBe(true);
  });
});
