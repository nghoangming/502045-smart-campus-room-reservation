import { APIRequestContext, expect } from '@playwright/test';
import { adminHeaders, authHeaders } from './api-auth';
import { apiUsers } from '../fixtures/users';
import { getJson, postJson } from './api';

let scenarioNumber = 0;

/** A future slot that changes between scenarios and separate test runs. */
export function uniqueFutureSlot() {
  const dayOffset = 30 + (Math.floor(Date.now() / 1000) % 20_000) + scenarioNumber++;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + dayOffset);
  start.setUTCHours(6, 0, 0, 0);
  return {
    startTime: start.toISOString(),
    endTime: new Date(start.getTime() + 60 * 60_000).toISOString(),
  };
}

export async function createApprovedClassSession(request: APIRequestContext, label: string) {
  const teacher = await authHeaders(request, {
    email: process.env.TEST_TEACHER_EMAIL || 'teacher@smartcampus.test',
    password: process.env.TEST_TEACHER_PASSWORD || 'Teacher@123',
  });
  const admin = await adminHeaders(request);
  const { res: roomsResponse, body: rooms } = await getJson<Array<{ id: number; type: string; status: string }>>(
    request, '/rooms', admin,
  );
  expect(roomsResponse.status()).toBe(200);
  const room = rooms.find((candidate) => ['LAB', 'THEORY'].includes(candidate.type) && candidate.status === 'ACTIVE');
  expect(room, 'test database must contain an ACTIVE classroom').toBeTruthy();

  const slot = uniqueFutureSlot();
  const created = await postJson<{ reservation: { id: number; status: string }; session: { id: number } }>(
    request, '/classroom-reservations/with-session', {
      roomId: room!.id,
      ...slot,
      courseCode: `QA${Date.now().toString().slice(-8)}`,
      title: `Playwright ${label}`,
      makeup: false,
    }, teacher,
  );
  expect(created.res.status()).toBe(201);
  const approved = await request.patch(`/api/v1/classroom-reservations/${created.body.reservation.id}/approve`, {
    headers: admin,
  });
  expect(approved.status()).toBe(200);
  expect((await approved.json()).status).toBe('CONFIRMED');
  return { sessionId: created.body.session.id, roomId: room!.id, teacher, admin };
}

export async function reserveStudentSeat(request: APIRequestContext, sessionId: number) {
  const student = await authHeaders(request, apiUsers.student);
  const { res, body: seats } = await getJson<Array<{ id: number; status: string }>>(
    request, `/class-sessions/${sessionId}/seats`, student,
  );
  expect(res.status()).toBe(200);
  const available = seats.find((seat) => seat.status === 'AVAILABLE');
  expect(available, 'the test classroom must have an available seat').toBeTruthy();
  const reserved = await postJson<{ id: number; status: string }>(request, '/seat-reservations', {
    classSessionId: sessionId, seatId: available!.id,
  }, student);
  expect(reserved.res.status()).toBe(201);
  return { student, seatReservationId: reserved.body.id };
}
