import { test, expect } from '@playwright/test';
import { z } from 'zod';
import { ApiClient, TimingCollector, assertSchema } from '../../src/index.js';

const baseUrl = process.env.PLAYKIT_BASE_URL || 'http://127.0.0.1:4173';

const HealthSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
});

const ItemsSchema = z.object({
  items: z.array(z.object({ id: z.number(), name: z.string() })),
});

test.describe('playkit selftest — ApiClient', () => {
  test('GET /api/health with Zod schema', async () => {
    const timings = new TimingCollector();
    const api = new ApiClient({ baseUrl });

    const res = await timings.measure('api_health', () =>
      api.get<{ status: string; service: string }>('/api/health', {
        expectedStatus: 200,
        schema: HealthSchema,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
    // signature: assertSchema(data, schema)
    expect(assertSchema(res.data, HealthSchema).service).toBe('playkit-selftest');
  });

  test('GET /api/items + expectedStatus on boom', async () => {
    const api = new ApiClient({ baseUrl });
    const items = await api.get('/api/items', { schema: ItemsSchema });
    expect(items.data.items[0]?.name).toBe('alpha');
    expect(items.data.items).toHaveLength(2);

    const boom = await api.get('/api/boom', { expectedStatus: 500 });
    expect(boom.status).toBe(500);
  });
});
