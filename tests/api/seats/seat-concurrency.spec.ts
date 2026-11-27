import { test, expect } from '@playwright/test';
import { getJson, postJson } from '../../helpers/api';
import { authHeaders } from '../../helpers/api-auth';
import { apiUsers } from '../../fixtures/users';
import { createApprovedClassSession } from '../../helpers/booking-scenarios';

test.describe('Seat reservation concurrency', () => {
  test('first student hold protects the seat until confirmation', async ({ request }) => {
    test.skip(!process.env.TEST_STUDENT2_EMAIL, 'Set TEST_STUDENT2_EMAIL/PASSWORD to enable two-account coverage.');
    const { sessionId } = await createApprovedClassSession(request, 'seat hold priority');
    const studentA = await authHeaders(request, apiUsers.student);
    const studentB = await authHeaders(request, apiUsers.student2);
    const seats = await getJson<Array<{ id: number; status: string }>>(request, `/class-sessions/${sessionId}/seats`, studentA);
    expect(seats.res.status()).toBe(200);
    const seatId = seats.body.find((seat) => seat.status === 'AVAILABLE')!.id;

    const first = await postJson<{ id: number; expiresAt: string }>(request, '/seat-reservations/hold', { classSessionId: sessionId, seatId }, studentA);
    expect(first.res.status()).toBe(201);
    expect(new Date(first.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    const pendingMap = await getJson<Array<{ id: number; status: string }>>(request, `/class-sessions/${sessionId}/seats`, studentB);
    expect(pendingMap.body.find((seat) => seat.id === seatId)?.status).toBe('PENDING');
    const second = await postJson(request, '/seat-reservations/hold', { classSessionId: sessionId, seatId }, studentB);
    expect(second.res.status()).toBe(409);

    const confirmed = await request.patch(`/api/v1/seat-reservations/${first.body.id}/confirm`, { headers: studentA });
    expect(confirmed.status()).toBe(200);
    expect((await confirmed.json()).status).toBe('CONFIRMED');
    const confirmedMap = await getJson<Array<{ id: number; status: string }>>(request, `/class-sessions/${sessionId}/seats`, studentB);
    expect(confirmedMap.body.find((seat) => seat.id === seatId)?.status).toBe('RESERVED');
    const secondAfterConfirmation = await postJson(request, '/seat-reservations/hold', { classSessionId: sessionId, seatId }, studentB);
    expect(secondAfterConfirmation.res.status()).toBe(409);
  });

  test('two students racing for one seat produce exactly one successful response', async ({ request }) => {
    test.skip(!process.env.TEST_STUDENT2_EMAIL, 'Set TEST_STUDENT2_EMAIL/PASSWORD to enable two-account concurrency coverage.');
    const { sessionId } = await createApprovedClassSession(request, 'seat concurrency');
    const studentA = await authHeaders(request, apiUsers.student);
    const studentB = await authHeaders(request, apiUsers.student2);
    const seats = await getJson<Array<{ id: number }>>(request, `/class-sessions/${sessionId}/seats`, studentA);
    expect(seats.res.status()).toBe(200);
    const seatId = seats.body[0].id;
    const responses = await Promise.all([
      postJson(request, '/seat-reservations', { classSessionId: sessionId, seatId }, studentA),
      postJson(request, '/seat-reservations', { classSessionId: sessionId, seatId }, studentB),
    ]);
    expect(responses.filter((result) => result.res.status() === 201)).toHaveLength(1);
    expect(responses.filter((result) => [409, 422].includes(result.res.status()))).toHaveLength(1);
    const winner = responses.find((result) => result.res.status() === 201)!;
    const winnerReservation = winner.body as { id: number; seatId: number; status: string };
    const winnerHeaders = responses[0] === winner ? studentA : studentB;
    const loserHeaders = responses[0] === winner ? studentB : studentA;
    const persisted = await getJson<{ id: number; seatId: number; status: string }>(
      request, `/seat-reservations/${winnerReservation.id}`, winnerHeaders,
    );
    expect(persisted.body.seatId).toBe(seatId);
    expect(persisted.body.status).toBe('CONFIRMED');
    const loserSeats = await getJson<Array<{ classSessionId: number; seatId: number }>>(
      request, '/seat-reservations/mine', loserHeaders,
    );
    expect(loserSeats.body.some((entry) => entry.classSessionId === sessionId && entry.seatId === seatId)).toBe(false);
  });
});
