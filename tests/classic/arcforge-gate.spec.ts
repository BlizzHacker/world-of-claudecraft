import { test, expect } from '@playwright/test';
const BASE = process.env.CR_SMOKE_URL || 'http://localhost:8803';
test('arcforge proxy rejects anonymous', async ({ request }) => {
  const res = await request.get(`${BASE}/me/api/arcforge/health`);
  expect([401, 403]).toContain(res.status());
});
