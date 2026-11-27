import { test, expect } from '@playwright/test';
import { getJson, isoDate } from '../../helpers/api';

test.describe('Availability API', () => {
  const query = (date: string, startTime: string, endTime: string) =>
    `date=${date}&startTime=${startTime}&endTime=${endTime}`;

  test('returns an array of rooms for a valid free interval', async ({ request }) => {
    const { res, body } = await getJson<Array<{ id: string | number }>>(
      request, `/rooms/availability?${query('2099-01-01', '08:00', '10:00')}`,
    );
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    for (const room of body) expect(room.id).toBeDefined();
  });

  test('rejects end time before or equal to start time', async ({ request }) => {
    for (const [start, end] of [['10:00', '08:00'], ['10:00', '10:00']]) {
      const { res } = await getJson(request, `/rooms/availability?${query(isoDate(), start, end)}`);
      expect(res.status()).toBe(400);
    }
  });

  test('rejects missing or malformed query parameters', async ({ request }) => {
    for (const path of [`/rooms/availability?date=${isoDate()}`, `/rooms/availability?${query(isoDate(), '25:99', '26:00')}`]) {
      const { res } = await getJson(request, path);
      expect(res.status()).toBe(400);
    }
  });
});
