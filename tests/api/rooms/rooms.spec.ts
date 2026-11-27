import { test, expect } from '@playwright/test';
import { getJson } from '../../helpers/api';
import { NOT_FOUND_ROOM_ID } from '../../fixtures/rooms';
import { adminHeaders } from '../../helpers/api-auth';

type Room = { id: string | number; name: string; type?: string };

test.describe('Room API - danh sách phòng', () => {
  test('GET /rooms trả 200 và là mảng không rỗng', async ({ request }) => {
    const headers = await adminHeaders(request);
    const { res, body } = await getJson<Room[]>(request, '/rooms', headers);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('mỗi phòng có id và name', async ({ request }) => {
    const headers = await adminHeaders(request);
    const { body } = await getJson<Room[]>(request, '/rooms', headers);
    for (const room of body) {
      expect(room.id).toBeDefined();
      expect(typeof room.name).toBe('string');
      expect(room.name.length).toBeGreaterThan(0);
    }
  });

  test('id các phòng không trùng nhau', async ({ request }) => {
    const headers = await adminHeaders(request);
    const { body } = await getJson<Room[]>(request, '/rooms', headers);
    const ids = body.map((r) => String(r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

test.describe('Room API - chi tiết phòng', () => {
  test('GET /rooms/{id} trả đúng phòng', async ({ request }) => {
    const headers = await adminHeaders(request);
    const { body: rooms } = await getJson<Room[]>(request, '/rooms', headers);
    const id = String(rooms[0].id);
    const { res, body } = await getJson<Room>(request, `/rooms/${id}`, headers);
    expect(res.status()).toBe(200);
    expect(String(body.id)).toBe(id);
  });

  test('GET /rooms/{id} với id không tồn tại trả 404 kèm thông báo lỗi', async ({ request }) => {
    const { res, body } = await getJson<{ status: number; message: string }>(
      request,
      `/rooms/${NOT_FOUND_ROOM_ID}`,
      await adminHeaders(request),
    );
    expect(res.status()).toBe(404);
    expect(body.status).toBe(404);
    expect(body.message).toBeTruthy();
  });
});
