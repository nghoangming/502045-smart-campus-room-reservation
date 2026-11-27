import { test, expect } from '@playwright/test';
import { getJson, postJson } from '../../helpers/api';
import { adminHeaders, authHeaders } from '../../helpers/api-auth';

test.describe('Incident workflow API', () => {
  test('teacher reports an incident and admin resolves it', async ({ request }) => {
    const teacher = await authHeaders(request, {
      email: process.env.TEST_TEACHER_EMAIL || 'teacher@smartcampus.test',
      password: process.env.TEST_TEACHER_PASSWORD || 'Teacher@123',
    });
    const admin = await adminHeaders(request);
    const { body: rooms } = await getJson<Array<{ id: number }>>(request, '/rooms', admin);
    const room = rooms[0];
    expect(room).toBeTruthy();

    const created = await postJson<{ id: number; status: string }>(request, '/incidents', {
      roomId: room!.id, category: 'PROJECTOR', description: `Playwright incident ${Date.now()}`,
    }, teacher);
    expect(created.res.status()).toBe(201);
    expect(created.body.status).toBe('OPEN');

    const updated = await request.patch(`/api/v1/incidents/${created.body.id}`, {
      data: { status: 'RESOLVED' }, headers: admin,
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).status).toBe('RESOLVED');

    const teacherNotifications = await getJson<Array<{ incidentId: number; id: number; read: boolean }>>(
      request, '/notifications', teacher,
    );
    const notice = teacherNotifications.body.find((item) => item.incidentId === created.body.id);
    expect(notice).toBeTruthy();
    const marked = await request.patch(`/api/v1/notifications/${notice!.id}/read`, { headers: teacher });
    expect(marked.status()).toBe(200);
    expect((await marked.json()).read).toBe(true);
  });

  test('rejects invalid incident categories and missing authentication', async ({ request }) => {
    const teacher = await authHeaders(request, {
      email: process.env.TEST_TEACHER_EMAIL || 'teacher@smartcampus.test',
      password: process.env.TEST_TEACHER_PASSWORD || 'Teacher@123',
    });
    const { body: rooms } = await getJson<Array<{ id: number }>>(request, '/rooms', await adminHeaders(request));
    expect(rooms.length).toBeGreaterThan(0);
    const invalid = await postJson(request, '/incidents', {
      roomId: rooms[0].id, category: 'INVALID', description: 'A sufficiently long description',
    }, teacher);
    expect(invalid.res.status()).toBe(400);
    const unauthenticated = await getJson(request, '/incidents');
    expect(unauthenticated.res.status()).toBe(401);
  });
});
