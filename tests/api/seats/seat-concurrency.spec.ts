import { test, expect } from '@playwright/test';
import { bookingPaths, Reservation } from '../../fixtures/booking';
import { getJson, postJson } from '../../helpers/api';
import { pending } from '../../helpers/pending';

type Seat = { id: string | number; roomId?: string | number; status?: string };

pending('Seat booking concurrency – tuần 4 (chờ API M2/M3)', () => {
  test('hai yêu cầu đồng thời đặt cùng ghế: chỉ một yêu cầu thành công', async ({ request }) => {
    const { res: seatsRes, body: seats } = await getJson<Seat[]>(request, bookingPaths.seats);
    expect(seatsRes.status()).toBe(200);
    expect(seats.length).toBeGreaterThan(0);
    const seat = seats[0];
    const date = new Date();
    date.setDate(date.getDate() + 9);
    const payload = {
      seatId: String(seat.id),
      roomId: seat.roomId,
      date: date.toISOString().slice(0, 10),
      startTime: '13:00',
      endTime: '14:00',
    };

    const responses = await Promise.all([
      postJson<Reservation>(request, `${bookingPaths.seats}/reservations`, payload),
      postJson<Reservation>(request, `${bookingPaths.seats}/reservations`, payload),
    ]);
    const statuses = responses.map(({ res }) => res.status()).sort((a, b) => a - b);
    expect(statuses.filter((status) => [200, 201].includes(status))).toHaveLength(1);
    expect(statuses.filter((status) => [409, 422].includes(status))).toHaveLength(1);
  });

  test('hai yêu cầu đồng thời đặt cùng phòng cùng khung giờ: chỉ một yêu cầu thành công', async ({ request }) => {
    const rooms = await getJson<Array<{ id: string | number }>>(request, '/rooms');
    expect(rooms.res.status()).toBe(200);
    const roomId = String(rooms.body[0].id);
    const date = new Date();
    date.setDate(date.getDate() + 10);
    const payload = {
      roomId,
      date: date.toISOString().slice(0, 10),
      startTime: '15:00',
      endTime: '16:00',
    };
    const results = await Promise.all([
      postJson(request, bookingPaths.reservations, payload),
      postJson(request, bookingPaths.reservations, payload),
    ]);
    const statuses = results.map(({ res }) => res.status());
    expect(statuses.filter((status) => [200, 201].includes(status))).toHaveLength(1);
    expect(statuses.filter((status) => [409, 422].includes(status))).toHaveLength(1);
  });
});
