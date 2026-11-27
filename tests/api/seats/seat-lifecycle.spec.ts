import { test, expect } from '@playwright/test';
import { authHeaders } from '../../helpers/api-auth';
import { apiUsers } from '../../fixtures/users';
import { postJson, getJson } from '../../helpers/api';
import { createApprovedClassSession } from '../../helpers/booking-scenarios';

test('student views plan, reserves a seat, sees own reservation, and cancels it', async ({ request }) => {
  const { sessionId } = await createApprovedClassSession(request, 'seat lifecycle');
  const student = await authHeaders(request, apiUsers.student);
  const { res: seatsResponse, body: seats } = await getJson<Array<{ id: number; status?: string }>>(request, `/class-sessions/${sessionId}/seats`, student);
  expect(seatsResponse.status()).toBe(200);
  const seat = seats.find((candidate) => !candidate.status || candidate.status === 'AVAILABLE');
  test.skip(!seat, 'No available seat in the configured session.');
  const reservation = await postJson<{ id: number; status: string }>(request, '/seat-reservations', { classSessionId: Number(sessionId), seatId: seat!.id }, student);
  expect(reservation.res.status()).toBe(201);
  const mine = await getJson<Array<{ id: number }>>(request, '/seat-reservations/mine', student);
  expect(mine.res.status()).toBe(200);
  expect(mine.body.some((entry) => entry.id === reservation.body.id)).toBe(true);
  const cancel = await request.patch(`/api/v1/seat-reservations/${reservation.body.id}/cancel`, { headers: student });
  expect(cancel.status()).toBe(200);
  expect((await cancel.json()).status).toBe('CANCELLED');
});
