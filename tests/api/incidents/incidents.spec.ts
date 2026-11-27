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

  test('admin can assign an incident to a person or either team', async ({ request }) => {
    const teacher = await authHeaders(request, {
      email: process.env.TEST_TEACHER_EMAIL || 'teacher@smartcampus.test',
      password: process.env.TEST_TEACHER_PASSWORD || 'Teacher@123',
    });
    const admin = await adminHeaders(request);
    const { body: rooms } = await getJson<Array<{ id: number }>>(request, '/rooms', admin);
    expect(rooms.length).toBeGreaterThan(0);
    const created = await postJson<{ id: number; roomId: number | null; facultyCode: string | null }>(
      request, '/incidents', { roomId: rooms[0].id, resourceId: null, category: 'OTHER',
        description: `Playwright incident assignment ${Date.now()}` }, teacher,
    );
    expect(created.res.status()).toBe(201);
    expect(created.body.roomId).toBe(rooms[0].id);
    expect(created.body.facultyCode).toBeTruthy();
    const invalidAssignee = await request.patch(`/api/v1/incidents/${created.body.id}`, {
      data: { status: 'IN_PROGRESS', assignedTo: 999999999, assignedTeam: '' }, headers: admin,
    });
    expect(invalidAssignee.status()).toBe(400);
    const assigned = await request.patch(`/api/v1/incidents/${created.body.id}`, {
      data: { status: 'IN_PROGRESS', assignedTeam: 'HARDWARE' }, headers: admin,
    });
    expect(assigned.status()).toBe(200);
    expect((await assigned.json()).assignedTeam).toBe('HARDWARE');
    const softwareTeam = await request.patch(`/api/v1/incidents/${created.body.id}`, {
      data: { status: 'IN_PROGRESS', assignedTeam: 'SOFTWARE' }, headers: admin,
    });
    expect(softwareTeam.status()).toBe(200);
    expect((await softwareTeam.json()).assignedTeam).toBe('SOFTWARE');
    const users = await getJson<Array<{ id: number; role: string }>>(request, '/users', admin);
    const person = users.body.find(user => user.role === 'TEACHER');
    expect(person).toBeTruthy();
    const assignedPerson = await request.patch(`/api/v1/incidents/${created.body.id}`, {
      data: { status: 'IN_PROGRESS', assignedTo: person!.id, assignedTeam: '' }, headers: admin,
    });
    expect(assignedPerson.status()).toBe(200);
    expect((await assignedPerson.json()).assignedTo).toBe(person!.id);
    const resolved = await request.patch(`/api/v1/incidents/${created.body.id}`, {
      data: { status: 'RESOLVED' }, headers: admin,
    });
    expect(resolved.status()).toBe(200);
    expect((await resolved.json()).assignedTo).toBe(person!.id);
  });
});
