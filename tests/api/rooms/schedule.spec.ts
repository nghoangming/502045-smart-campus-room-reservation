import { test, expect } from '@playwright/test';
import { getJson, firstRoomId, isoDate } from '../../helpers/api';
import { NOT_FOUND_ROOM_ID } from '../../fixtures/rooms';

/**
 * Hợp đồng API lịch dùng bookings PostgreSQL:
 *   GET /api/v1/rooms/{id}/schedule?date=YYYY-MM-DD
 *   200 -> mảng booking với startTime và endTime
 *   400 -> date sai định dạng / thiếu
 *   404 -> phòng không tồn tại
 */
test.describe('Schedule API - PostgreSQL bookings', () => {
  test('lấy lịch phòng theo ngày trả 200 và là mảng', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res, body } = await getJson<unknown[]>(request, `/rooms/${id}/schedule?date=${isoDate()}`);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test('mỗi mục lịch có start và end, start < end', async ({ request }) => {
    const id = await firstRoomId(request);
    const { body } = await getJson<Array<{ startTime: string; endTime: string }>>(
      request,
      `/rooms/${id}/schedule?date=${isoDate()}`,
    );
    for (const slot of body) {
      expect(new Date(slot.startTime).getTime()).toBeLessThan(new Date(slot.endTime).getTime());
    }
  });

  test('ngày không có lịch trả mảng rỗng (không phải lỗi)', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res, body } = await getJson<unknown[]>(request, `/rooms/${id}/schedule?date=2099-01-01`);
    expect(res.status()).toBe(200);
    expect(body).toEqual([]);
  });

  test('date sai định dạng trả 400', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res } = await getJson(request, `/rooms/${id}/schedule?date=khong-phai-ngay`);
    expect(res.status()).toBe(400);
  });

  test('thiếu tham số date trả 400', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res } = await getJson(request, `/rooms/${id}/schedule`);
    expect(res.status()).toBe(400);
  });

  test('phòng không tồn tại trả 404', async ({ request }) => {
    const { res } = await getJson(request, `/rooms/${NOT_FOUND_ROOM_ID}/schedule?date=${isoDate()}`);
    expect(res.status()).toBe(404);
  });
});
