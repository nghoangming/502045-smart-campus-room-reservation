import { test, expect } from '@playwright/test';
import { bookingPaths, bookingSlot, Reservation, reservationId } from '../../fixtures/booking';
import { firstRoomId, getJson, patchJson, postJson } from '../../helpers/api';
import { pending } from '../../helpers/pending';

type ClassSession = { id: number | string; bookingId: number | string };
type Seat = { id: number | string; roomId: number | string; status: string };
type SeatReservation = { id: number | string; status: string };

pending('Seat and room concurrency – tuần 4 (chờ backend tuần 3–4 được tích hợp)', () => {
  test('hai request đồng thời đặt cùng ghế trong cùng class session: chỉ một request thành công', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(36);
    const booking = await postJson<Reservation>(request, bookingPaths.classroomReservations, {
      roomId: Number(roomId), ...slot,
    });
    expect(booking.res.status()).toBe(201);
    const bookingId = reservationId(booking.body);

    try {
      const sessionResponse = await postJson<ClassSession>(request, bookingPaths.classSessions, {
        bookingId: Number(bookingId),
        courseCode: `QA${Date.now()}`,
        title: 'Playwright concurrency test session',
      });
      expect(sessionResponse.res.status()).toBe(201);

      const sessionId = String(sessionResponse.body.id);
      const { res: seatsResponse, body: seats } = await getJson<Seat[]>(
        request,
        `${bookingPaths.classSessions}/${sessionId}/seats`,
      );
      expect(seatsResponse.status()).toBe(200);
      test.skip(seats.length === 0, 'Cần seed ít nhất một ghế cho room của class session');
      const seat = seats.find((item) => item.status === 'AVAILABLE');
      test.skip(!seat, 'Cần ít nhất một ghế AVAILABLE cho room của class session');

      const attempts = await Promise.all([
        postJson<SeatReservation>(request, bookingPaths.seatReservations, {
          classSessionId: Number(sessionId), seatId: Number(seat!.id),
        }),
        postJson<SeatReservation>(request, bookingPaths.seatReservations, {
          classSessionId: Number(sessionId), seatId: Number(seat!.id),
        }),
      ]);
      const statuses = attempts.map(({ res }) => res.status());
      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(1);
    } finally {
      await patchJson(request, `${bookingPaths.classroomReservations}/${bookingId}/cancel`);
    }
  });

  test('hai request đồng thời đặt cùng phòng và khung giờ: chỉ một request thành công', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(37);
    const attempts = await Promise.all([
      postJson<Reservation>(request, bookingPaths.studyRoomReservations, {
        roomId: Number(roomId), ...slot,
      }),
      postJson<Reservation>(request, bookingPaths.studyRoomReservations, {
        roomId: Number(roomId), ...slot,
      }),
    ]);

    const winners = attempts.filter(({ res }) => res.status() === 201);
    try {
      expect(winners).toHaveLength(1);
      expect(attempts.filter(({ res }) => res.status() === 409)).toHaveLength(1);
    } finally {
      await Promise.all(winners.map(({ body }) =>
        patchJson(request, `${bookingPaths.studyRoomReservations}/${reservationId(body)}/cancel`),
      ));
    }
  });
});
