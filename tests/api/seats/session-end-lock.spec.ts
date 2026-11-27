import { test, expect } from '@playwright/test';
import { apiUsers } from '../../fixtures/users';
import { authHeaders } from '../../helpers/api-auth';

test.describe('Seat reservations after a class ends', () => {
  test('a student cannot book a seat in an ended class session', async ({ request }) => {
    const sessionId = process.env.TEST_ENDED_CLASS_SESSION_ID;
    const seatId = process.env.TEST_ENDED_SEAT_ID;
    test.skip(!sessionId || !seatId, 'Set TEST_ENDED_CLASS_SESSION_ID and TEST_ENDED_SEAT_ID to an ended confirmed session and one of its seats.');
    const student = await authHeaders(request, apiUsers.student);
    const response = await request.post('/api/v1/seat-reservations', {
      headers: student, data: { classSessionId: Number(sessionId), seatId: Number(seatId) },
    });
    expect(response.status()).toBe(400);
  });

  test('a student cannot cancel a seat reservation after its class ends', async ({ request }) => {
    const reservationId = process.env.TEST_ENDED_SEAT_RESERVATION_ID;
    test.skip(!reservationId, 'Set TEST_ENDED_SEAT_RESERVATION_ID to a confirmed seat reservation for an ended class session.');
    const student = await authHeaders(request, apiUsers.student);
    const response = await request.patch(`/api/v1/seat-reservations/${reservationId}/cancel`, { headers: student });
    expect(response.status()).toBe(400);
  });
});
