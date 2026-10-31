import { test, expect } from '@playwright/test';
import { getJson, isoDate } from '../../helpers/api';
import { pending } from '../../helpers/pending';

type Room = { id: string | number; name: string; status?: string };

/**
 * Contract from backend RoomController:
 * GET /api/v1/rooms/availability?date=YYYY-MM-DD&startTime=HH:mm&endTime=HH:mm
 * 200 -> list of available rooms; 400 -> invalid/missing query parameters.
 */
pending('Availability API @pending (chờ chạy cùng backend đã cập nhật)', () => {
  const query = (date: string, startTime: string, endTime: string) =>
    `date=${date}&startTime=${startTime}&endTime=${endTime}`;

  test('khung giờ trống tương lai trả danh sách phòng khả dụng', async ({ request }) => {
    const { res, body } = await getJson<Room[]>(
      request,
      `/rooms/availability?${query('2099-01-01', '08:00', '10:00')}`,
    );
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].id).toBeDefined();
  });

  test('end trước hoặc bằng start trả 400', async ({ request }) => {
    for (const [start, end] of [['10:00', '08:00'], ['10:00', '10:00']]) {
      const { res } = await getJson(
        request,
        `/rooms/availability?${query(isoDate(), start, end)}`,
      );
      expect(res.status()).toBe(400);
    }
  });

  test('thiếu date/startTime/endTime trả 400', async ({ request }) => {
    const { res } = await getJson(request, `/rooms/availability?date=${isoDate()}`);
    expect(res.status()).toBe(400);
  });

  test('date hoặc giờ sai định dạng trả 400', async ({ request }) => {
    const invalidDate = await getJson(
      request,
      `/rooms/availability?${query('not-a-date', '08:00', '10:00')}`,
    );
    expect(invalidDate.res.status()).toBe(400);

    const invalidTime = await getJson(
      request,
      `/rooms/availability?${query(isoDate(), '25:99', '26:00')}`,
    );
    expect(invalidTime.res.status()).toBe(400);
  });
});
