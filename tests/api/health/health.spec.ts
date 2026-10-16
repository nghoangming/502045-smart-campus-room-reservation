import { test, expect } from '@playwright/test';

test.describe('GET /api/v1/health', () => {
  test('backend đang chạy và trả 200', async ({ request }) => {
    const res = await request.get('/api/v1/health');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('Smart Campus Backend is running');
  });
});
