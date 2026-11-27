import { test, expect } from '@playwright/test';
import { adminHeaders } from '../../helpers/api-auth';

test('admin can create, update status, read, and delete an isolated room', async ({ request }) => {
  const headers = await adminHeaders(request);
  const suffix = `${Date.now()}`;
  const room = { code: `C${suffix}`.slice(-20), name: `Playwright room ${suffix}`, location: 'Test only', status: 'ACTIVE', type: 'SELF_STUDY', capacity: 2 };
  const created = await request.post('/api/v1/rooms', { headers, data: room });
  expect(created.status()).toBe(201);
  const body = await created.json() as { id: number; status: string };
  try {
    expect(body.status).toBe('ACTIVE');
    const updated = await request.patch(`/api/v1/rooms/${body.id}`, { headers, data: { ...room, status: 'MAINTENANCE' } });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).status).toBe('MAINTENANCE');
    const read = await request.get(`/api/v1/rooms/${body.id}`, { headers });
    expect(read.status()).toBe(200);
    expect((await read.json()).id).toBe(body.id);
  } finally {
    const deleted = await request.delete(`/api/v1/rooms/${body.id}`, { headers });
    expect(deleted.status()).toBe(204);
  }
  expect((await request.get(`/api/v1/rooms/${body.id}`, { headers })).status()).toBe(404);
});
