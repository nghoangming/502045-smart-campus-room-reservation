import { test, expect } from '@playwright/test';
import { getJson, firstRoomId } from '../../helpers/api';
import { NOT_FOUND_ROOM_ID } from '../../fixtures/rooms';

type Room = { id: string | number; name: string; type?: string };

test.describe('Room API - danh sách phòng', () => {
  test('GET /rooms trả 200 và là mảng không rỗng', async ({ request }) => {
    const { res, body } = await getJson<Room[]>(request, '/rooms');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('mỗi phòng có id và name', async ({ request }) => {
    const { body } = await getJson<Room[]>(request, '/rooms');
    for (const room of body) {
      expect(room.id).toBeDefined();
      expect(typeof room.name).toBe('string');
      expect(room.name.length).toBeGreaterThan(0);
    }
  });

  test('id các phòng không trùng nhau', async ({ request }) => {
    const { body } = await getJson<Room[]>(request, '/rooms');
    const ids = body.map((r) => String(r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

test.describe('Room API - chi tiết phòng', () => {
  test('GET /rooms/{id} trả đúng phòng', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res, body } = await getJson<Room>(request, `/rooms/${id}`);
    expect(res.status()).toBe(200);
    expect(String(body.id)).toBe(id);
  });

  test('GET /rooms/{id} với id không tồn tại trả 404 kèm thông báo lỗi', async ({ request }) => {
    const { res, body } = await getJson<{ status: number; message: string }>(
      request,
      `/rooms/${NOT_FOUND_ROOM_ID}`,
    );
    expect(res.status()).toBe(404);
    expect(body.status).toBe(404);
    expect(body.message).toBeTruthy();
  });
});
