import { test, expect } from '@playwright/test';
import { adminHeaders, authHeaders } from '../../helpers/api-auth';
import { getJson, postJson } from '../../helpers/api';
import { uniqueFutureSlot } from '../../helpers/booking-scenarios';

test.describe('Classroom booking approval workflow', () => {
  test('teacher creates future booking, admin approves, teacher creates class session', async ({ request }) => {
    const teacher = await authHeaders(request, {
      email: process.env.TEST_TEACHER_EMAIL || 'teacher@smartcampus.test',
      password: process.env.TEST_TEACHER_PASSWORD || 'Teacher@123',
    });
    const admin = await adminHeaders(request);
    const { res: roomsResponse, body: rooms } = await getJson<Array<{ id: number; type: string }>>(request, '/rooms', teacher);
    expect(roomsResponse.status()).toBe(200);
    const room = rooms.find((candidate) => ['LAB', 'THEORY'].includes(candidate.type));
    test.skip(!room, 'Requires an ACTIVE classroom in the test database.');

    const created = await postJson<{ reservation: { id: number; status: string }; session: { id: number } }>(request,
      '/classroom-reservations/with-session', {
        roomId: room!.id, ...uniqueFutureSlot(), courseCode: `PW-${Date.now()}`, title: 'Playwright workflow test', makeup: false,
      }, teacher);
    expect(created.res.status()).toBe(201);
    expect(created.body.reservation.status).toBe('PENDING');
    expect(created.body.session.id).toBeTruthy();

    const approval = await request.patch(`/api/v1/classroom-reservations/${created.body.reservation.id}/approve`, { headers: admin });
    expect(approval.status()).toBe(200);
    expect((await approval.json()).status).toBe('CONFIRMED');

    const rejectionSetup = await postJson<{ id: number }>(request, '/classroom-reservations', {
      roomId: room!.id, ...uniqueFutureSlot(),
    }, teacher);
    expect(rejectionSetup.res.status()).toBe(201);
    const rejection = await request.patch(`/api/v1/classroom-reservations/${rejectionSetup.body.id}/reject`, { headers: admin });
    expect(rejection.status()).toBe(200);
    expect((await rejection.json()).status).toBe('REJECTED');
  });
});

