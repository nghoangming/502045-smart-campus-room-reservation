import { test, expect } from '@playwright/test';
import { getJson, postJson } from '../../helpers/api';
import { adminHeaders } from '../../helpers/api-auth';

test.describe('Resource API', () => {
  test('admin can create, update status, and delete a resource', async ({ request }) => {
    const headers = await adminHeaders(request);
    const { body: rooms } = await getJson<Array<{ id: number }>>(request, '/rooms', headers);
    expect(rooms.length).toBeGreaterThan(0);
    const roomId = String(rooms[0].id);
    const name = `PW-${Date.now().toString().slice(-8)}`;
    const created = await postJson<{ id: number; status: string }>(request, `/resources/rooms/${roomId}`, {
      name, type: 'TEST', quantity: 1, status: 'AVAILABLE',
    }, headers);
    expect(created.res.status()).toBe(201);
    expect(created.body.status).toBe('AVAILABLE');

    const updated = await request.patch(`/api/v1/resources/${created.body.id}`, {
      data: { name, type: 'TEST', quantity: 1, status: 'MAINTENANCE' }, headers,
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).status).toBe('MAINTENANCE');

    const removed = await request.delete(`/api/v1/resources/${created.body.id}`, { headers });
    expect(removed.status()).toBe(204);
  });

  test('rejects an unsupported resource status', async ({ request }) => {
    const headers = await adminHeaders(request);
    const { body: rooms } = await getJson<Array<{ id: number }>>(request, '/rooms', headers);
    expect(rooms.length).toBeGreaterThan(0);
    const roomId = String(rooms[0].id);
    const response = await postJson(request, `/resources/rooms/${roomId}`, {
      name: 'Invalid', type: 'TEST', quantity: 1, status: 'UNKNOWN',
    }, headers);
    expect(response.res.status()).toBe(400);
  });

  test('resource list requires an authenticated user', async ({ request }) => {
    const { res } = await getJson(request, '/resources');
    expect(res.status()).toBe(401);
  });
});
