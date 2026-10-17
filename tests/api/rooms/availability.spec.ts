import { test, expect } from '@playwright/test';
import { getJson } from '../../helpers/api';

type Room = { id: number; code: string; status: string };

test.describe('Availability API - real PostgreSQL bookings', () => {
  test('loại phòng trùng giờ và bảo trì, bỏ qua lịch đã hủy', async ({ request }) => {
    const { res, body } = await getJson<Room[]>(request,
      '/rooms/availability?date=2026-10-16&startTime=08:00&endTime=10:00');
    expect(res.status()).toBe(200);
    expect(body.map(room => room.code).sort()).toEqual(['B201', 'C301', 'C302']);
  });

  test('booking kết thúc đúng giờ bắt đầu không làm phòng bị bận', async ({ request }) => {
    const { res, body } = await getJson<Room[]>(request,
      '/rooms/availability?date=2026-10-16&startTime=10:00&endTime=11:00');
    expect(res.status()).toBe(200);
    expect(body.map(room => room.code)).toContain('A101');
    expect(body.map(room => room.code)).not.toContain('A102');
  });

  test('end trước hoặc bằng start trả 400', async ({ request }) => {
    for (const endTime of ['08:00', '10:00']) {
      const { res } = await getJson(request,
        `/rooms/availability?date=2026-10-16&startTime=10:00&endTime=${endTime}`);
      expect(res.status()).toBe(400);
    }
  });

  test('thiếu tham số hoặc giờ sai định dạng trả 400', async ({ request }) => {
    const missing = await getJson(request, '/rooms/availability?date=2026-10-16');
    expect(missing.res.status()).toBe(400);
    const invalid = await getJson(request,
      '/rooms/availability?date=2026-10-16&startTime=25:99&endTime=26:00');
    expect(invalid.res.status()).toBe(400);
  });
});
