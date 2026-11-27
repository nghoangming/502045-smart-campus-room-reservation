import { test, expect } from '@playwright/test';
import { getJson } from '../../helpers/api';
import { adminHeaders } from '../../helpers/api-auth';

test.describe('Notification API', () => {
  test('lists notifications and mark-all-read is idempotent', async ({ request }) => {
    const headers = await adminHeaders(request);
    const listed = await getJson<Array<{ id: number; read: boolean }>>(request, '/notifications', headers);
    expect(listed.res.status()).toBe(200);
    expect(Array.isArray(listed.body)).toBe(true);

    const first = await request.patch('/api/v1/notifications/read-all', { headers });
    expect(first.status()).toBe(200);
    expect((await first.json()).updatedCount).toBeGreaterThanOrEqual(0);
    const second = await request.patch('/api/v1/notifications/read-all', { headers });
    expect(second.status()).toBe(200);
    expect((await second.json()).updatedCount).toBe(0);
  });

  test('rejects notification access without authentication', async ({ request }) => {
    const { res } = await getJson(request, '/notifications');
    expect(res.status()).toBe(401);
  });
});
