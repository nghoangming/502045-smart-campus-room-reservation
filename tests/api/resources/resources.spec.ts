import { test, expect } from '@playwright/test';
import { deleteJson, firstRoomId, getJson, postJson, putJson } from '../../helpers/api';
import { pending } from '../../helpers/pending';

type CampusResource = {
  id: number | string;
  roomId: number | string;
  resourceName: string;
  resourceType?: string;
  quantity: number;
  status: string;
};

const adminToken = process.env.TEST_ADMIN_TOKEN ?? '';
const authHeaders = () => ({ Authorization: `Bearer ${adminToken}` });

pending('Resource API – tuần 5 (chờ M2 triển khai API và auth)', () => {
  test('CRUD resource và cập nhật status', async ({ request }) => {
    test.skip(!adminToken, 'Cần TEST_ADMIN_TOKEN có quyền quản trị tài nguyên');
    const roomId = await firstRoomId(request);
    const resourceName = `playwright-resource-${Date.now()}`;
    const initial = {
      roomId: Number(roomId),
      resourceName,
      resourceType: 'TEST_EQUIPMENT',
      quantity: 2,
      status: 'AVAILABLE',
    };

    const created = await postJson<CampusResource>(request, '/resources', initial, authHeaders());
    expect(created.res.status()).toBe(201);
    expect(created.body.id).toBeDefined();
    expect(created.body.resourceName).toBe(resourceName);
    expect(created.body.status).toBe('AVAILABLE');

    const resourcePath = `/resources/${created.body.id}`;
    try {
      const fetched = await getJson<CampusResource>(request, resourcePath, authHeaders());
      expect(fetched.res.status()).toBe(200);
      expect(fetched.body.resourceName).toBe(resourceName);

      const updated = await putJson<CampusResource>(
        request,
        resourcePath,
        { ...initial, quantity: 1, status: 'MAINTENANCE' },
        authHeaders(),
      );
      expect(updated.res.status()).toBe(200);
      expect(updated.body.quantity).toBe(1);
      expect(updated.body.status).toBe('MAINTENANCE');

      const listed = await getJson<CampusResource[]>(request, `/resources?roomId=${roomId}`, authHeaders());
      expect(listed.res.status()).toBe(200);
      expect(listed.body.some((item) => String(item.id) === String(created.body.id))).toBe(true);
    } finally {
      const removed = await deleteJson(request, resourcePath, authHeaders());
      expect(removed.res.status()).toBe(204);
    }
  });

  test('thiếu roomId/resourceName bị từ chối', async ({ request }) => {
    test.skip(!adminToken, 'Cần TEST_ADMIN_TOKEN có quyền quản trị tài nguyên');
    const { res } = await postJson(request, '/resources', { quantity: 1 }, authHeaders());
    expect([400, 422]).toContain(res.status());
  });
});
