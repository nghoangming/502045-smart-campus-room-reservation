import { test, expect } from '@playwright/test';
import { getJson, firstRoomId, isoDate } from '../../helpers/api';
import { pending } from '../../helpers/pending';
import { NOT_FOUND_ROOM_ID } from '../../fixtures/rooms';

/**
 * Hợp đồng GIẢ ĐỊNH (cần chốt với M2 trong openapi.yaml):
 *   GET /api/v1/rooms/{id}/availability?date=YYYY-MM-DD&start=HH:mm&end=HH:mm
 *   200 -> { available: boolean }
 *   400 -> thiếu tham số, định dạng sai, hoặc end <= start
 *   404 -> phòng không tồn tại
 */
pending('Availability API @pending (chờ M2 implement GET /rooms/{id}/availability)', () => {
  const query = (date: string, start: string, end: string) =>
    `date=${date}&start=${start}&end=${end}`;

  test('khung giờ trống trả available = true', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res, body } = await getJson<{ available: boolean }>(
      request,
      `/rooms/${id}/availability?${query('2099-01-01', '08:00', '10:00')}`,
    );
    expect(res.status()).toBe(200);
    expect(body.available).toBe(true);
  });

  test('response có trường available kiểu boolean', async ({ request }) => {
    const id = await firstRoomId(request);
    const { body } = await getJson<{ available: boolean }>(
      request,
      `/rooms/${id}/availability?${query(isoDate(), '08:00', '10:00')}`,
    );
    expect(typeof body.available).toBe('boolean');
  });

  test('end trước hoặc bằng start trả 400', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res } = await getJson(request, `/rooms/${id}/availability?${query(isoDate(), '10:00', '08:00')}`);
    expect(res.status()).toBe(400);
  });

  test('thiếu tham số start/end trả 400', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res } = await getJson(request, `/rooms/${id}/availability?date=${isoDate()}`);
    expect(res.status()).toBe(400);
  });

  test('giờ sai định dạng trả 400', async ({ request }) => {
    const id = await firstRoomId(request);
    const { res } = await getJson(request, `/rooms/${id}/availability?${query(isoDate(), '25:99', '26:00')}`);
    expect(res.status()).toBe(400);
  });

  test('phòng không tồn tại trả 404', async ({ request }) => {
    const { res } = await getJson(
      request,
      `/rooms/${NOT_FOUND_ROOM_ID}/availability?${query(isoDate(), '08:00', '10:00')}`,
    );
    expect(res.status()).toBe(404);
  });
});
