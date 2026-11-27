import { test, expect } from '@playwright/test';
import { adminHeaders, studentHeaders } from '../../helpers/api-auth';
import { getJson, postJson } from '../../helpers/api';
import { uniqueFutureSlot } from '../../helpers/booking-scenarios';

test('admin approves a newly created pending study-room reservation', async ({ request }) => {
  const student = await studentHeaders(request);
  const admin = await adminHeaders(request);
  const { res: roomsResponse, body: rooms } = await getJson<Array<{ id: number; type: string }>>(
    request, '/rooms', student,
  );
  expect(roomsResponse.status()).toBe(200);
  const room = rooms.find((candidate) => candidate.type === 'SELF_STUDY');
  expect(room, 'test database must contain a SELF_STUDY room').toBeTruthy();
  const created = await postJson<{ id: number; status: string }>(request, '/study-room-reservations', {
    roomId: room!.id, ...uniqueFutureSlot(), note: 'Playwright pending approval fixture',
  }, student);
  expect(created.res.status()).toBe(201);
  expect(created.body.status).toBe('PENDING');

  const response = await request.patch(`/api/v1/study-room-reservations/${created.body.id}/approve`, { headers: admin });
  expect(response.status()).toBe(200);
  const reservation = await response.json() as { id: number; status: string };
  expect(reservation.id).toBe(created.body.id);
  expect(reservation.status).toBe('CONFIRMED');
});
