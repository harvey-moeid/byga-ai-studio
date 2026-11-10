import { Hono } from 'hono';
import { HealthResponseSchema } from '@byga/contracts';

type Variables = { requestId: string };

export const app = new Hono<{ Variables: Variables }>();

app.use('*', async (c, next) => {
  const requestId = `req_${crypto.randomUUID()}`;
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Frame-Options', 'DENY');
  c.header('Cache-Control', 'no-store');
  await next();
});

app.get('/api/v1/health', (c) => {
  const payload = HealthResponseSchema.parse({
    service: 'byga-ai-studio-api',
    status: 'ok',
    version: '0.1.0',
    checkedAt: new Date().toISOString()
  });
  return c.json(payload, 200);
});

app.notFound((c) => c.json({
  error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan.', requestId: c.get('requestId') }
}, 404));

app.onError((_error, c) => c.json({
  error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan internal.', requestId: c.get('requestId') }
}, 500));
