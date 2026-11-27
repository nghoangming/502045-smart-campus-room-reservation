import { test, expect } from '@playwright/test';
import { getJson, firstRoomId, isoDate } from '../../helpers/api';
import { NOT_FOUND_ROOM_ID } from '../../fixtures/rooms';
import { adminHeaders } from '../../helpers/api-auth';

/**
 * Endpoint cần JWT; response dùng startTime và endTime dạng offset datetime.
 */
test.describe('Schedule API', () => {
  test('lấy lịch phòng theo ngày trả 200 và là mảng', async ({ request }) => {
    const headers = await adminHeaders(request);
    const id = await firstRoomId(request, headers);
    const { res, body } = await getJson<unknown[]>(request, `/rooms/${id}/schedule?date=${isoDate()}`, headers);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test('mỗi mục lịch có start và end, start < end', async ({ request }) => {
    const headers = await adminHeaders(request);
    const id = await firstRoomId(request, headers);
    const { body } = await getJson<Array<{ startTime: string; endTime: string }>>(
      request,
      `/rooms/${id}/schedule?date=${isoDate()}`,
      headers,
    );
    for (const slot of body) {
      expect(new Date(slot.startTime).getTime()).toBeLessThan(new Date(slot.endTime).getTime());
    }
  });

  test('ngày không có lịch trả mảng rỗng (không phải lỗi)', async ({ request }) => {
    const headers = await adminHeaders(request);
    const id = await firstRoomId(request, headers);
    const { res, body } = await getJson<unknown[]>(request, `/rooms/${id}/schedule?date=2099-01-01`, headers);
    expect(res.status()).toBe(200);
    expect(body).toEqual([]);
  });

  test('date sai định dạng trả 400', async ({ request }) => {
    const headers = await adminHeaders(request);
    const id = await firstRoomId(request, headers);
    const { res } = await getJson(request, `/rooms/${id}/schedule?date=khong-phai-ngay`, headers);
    expect(res.status()).toBe(400);
  });

  test('thiếu tham số date trả 400', async ({ request }) => {
    const headers = await adminHeaders(request);
    const id = await firstRoomId(request, headers);
    const { res } = await getJson(request, `/rooms/${id}/schedule`, headers);
    expect(res.status()).toBe(400);
  });

  test('phòng không tồn tại trả 404', async ({ request }) => {
    const headers = await adminHeaders(request);
    const { res } = await getJson(request, `/rooms/${NOT_FOUND_ROOM_ID}/schedule?date=${isoDate()}`, headers);
    expect(res.status()).toBe(404);
  });
});
