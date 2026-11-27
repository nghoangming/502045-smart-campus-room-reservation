import { test, expect } from '@playwright/test';
import { postJson, getJson } from '../../helpers/api';
import { bookingPaths, Reservation, reservationId } from '../../fixtures/booking';
import { authHeaders, studentHeaders } from '../../helpers/api-auth';
import { apiUsers } from '../../fixtures/users';
import { uniqueFutureSlot } from '../../helpers/booking-scenarios';

const plusMinutes = (time: string, minutes: number) => new Date(Date.parse(time) + minutes * 60_000).toISOString();

async function studyRoomId(request: Parameters<typeof studentHeaders>[0], headers: Record<string, string>) {
  const { res, body } = await getJson<Array<{ id: string | number; type: string }>>(request, '/rooms', headers);
  expect(res.status()).toBe(200);
  const room = body.find((candidate) => candidate.type === 'SELF_STUDY');
  expect(room, 'seed a SELF_STUDY room for API tests').toBeTruthy();
  return String(room!.id);
}

test.describe('Study room reservations', () => {
  test('creates a reservation and cancels it through the lifecycle endpoint', async ({ request }) => {
    const headers = await studentHeaders(request);
    const roomId = await studyRoomId(request, headers);
    const created = await postJson<Reservation>(request, bookingPaths.reservations,
      { roomId, ...uniqueFutureSlot() }, headers);
    expect(created.res.status()).toBe(201);
    expect(String(created.body.roomId)).toBe(roomId);
    const id = reservationId(created.body);
    const canceled = await request.patch(`/api/v1${bookingPaths.reservations}/${id}/cancel`, { headers });
    expect(canceled.status()).toBe(200);
    expect((await canceled.json()).status).toBe('CANCELLED');
  });

  test('rejects an overlap and accepts adjacent intervals', async ({ request }) => {
    const headers = await studentHeaders(request);
    const roomId = await studyRoomId(request, headers);
    const slot = uniqueFutureSlot();
    const first = await postJson(request, bookingPaths.reservations, { roomId, ...slot }, headers);
    expect(first.res.status()).toBe(201);
    const overlap = await postJson(request, bookingPaths.reservations,
      { roomId, startTime: plusMinutes(slot.startTime, 30), endTime: plusMinutes(slot.startTime, 90) }, headers);
    expect(overlap.res.status()).toBe(409);
    const adjacent = await postJson(request, bookingPaths.reservations,
      { roomId, startTime: slot.endTime, endTime: plusMinutes(slot.endTime, 60) }, headers);
    expect(adjacent.res.status()).toBe(201);
  });

  test('two students racing for the same room interval produce one success', async ({ request }) => {
    test.skip(!process.env.TEST_STUDENT2_EMAIL, 'Set TEST_STUDENT2_EMAIL/PASSWORD to enable two-account concurrency coverage.');
    const studentA = await studentHeaders(request);
    const studentB = await authHeaders(request, apiUsers.student2);
    const roomId = await studyRoomId(request, studentA);
    const slot = uniqueFutureSlot();
    const results = await Promise.all([
      postJson(request, bookingPaths.reservations, { roomId, ...slot }, studentA),
      postJson(request, bookingPaths.reservations, { roomId, ...slot }, studentB),
    ]);
    expect(results.filter(({ res }) => res.status() === 201)).toHaveLength(1);
    expect(results.filter(({ res }) => res.status() === 409)).toHaveLength(1);
  });

  test('rejects invalid intervals and malformed payloads', async ({ request }) => {
    const headers = await studentHeaders(request);
    const roomId = await studyRoomId(request, headers);
    const future = uniqueFutureSlot().startTime;
    for (const data of [
      { roomId, startTime: future, endTime: future },
      { roomId, startTime: plusMinutes(future, 60), endTime: future },
      { roomId, startTime: 'bad', endTime: future },
      { roomId, startTime: future },
    ]) {
      const { res } = await postJson(request, bookingPaths.reservations, data, headers);
      expect(res.status()).toBe(400);
    }
  });
});
