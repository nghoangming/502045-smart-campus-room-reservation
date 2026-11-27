import { test, expect } from '@playwright/test';
import { authHeaders } from '../../helpers/api-auth';
import { apiUsers } from '../../fixtures/users';

test('teacher generates QR challenge, student checks in, and teacher can view attendance', async ({ request }) => {
  const sessionId = process.env.TEST_QR_WORKFLOW_SESSION_ID;
  test.skip(!sessionId, 'Set TEST_QR_WORKFLOW_SESSION_ID to a class session in the check-in window (5–20 minutes after start); student must have a confirmed seat.');
  const teacher = await authHeaders(request, {
    email: process.env.TEST_TEACHER_EMAIL || 'teacher@smartcampus.test',
    password: process.env.TEST_TEACHER_PASSWORD || 'Teacher@123',
  });
  const student = await authHeaders(request, apiUsers.student2);
  const sessionResponse = await request.get(`/api/v1/class-sessions/${sessionId}`, { headers: teacher });
  expect(sessionResponse.status()).toBe(200);
  const session = await sessionResponse.json() as { startTime: string };
  const elapsed = Date.now() - new Date(session.startTime).getTime();
  test.skip(elapsed < 5 * 60_000 || elapsed >= 20 * 60_000,
    'The configured session must be between 5 and 20 minutes after its start; QR check-in only works in this window.');
  const generated = await request.post(`/api/v1/class-sessions/${sessionId}/qr`, { headers: teacher });
  expect(generated.status()).toBe(200);
  const challenge = await generated.json() as { token: string; classSessionId: number; expiresAt: string };
  expect(challenge.token).toBeTruthy();
  expect(new Date(challenge.expiresAt).getTime()).toBeGreaterThan(Date.now());
  const checkin = await request.post('/api/v1/attendance/check-in', {
    headers: student, data: { qrCode: challenge.token, classSessionId: Number(sessionId) },
  });
  expect(checkin.status()).toBe(201);
  const attendance = await checkin.json() as { id: number; status: string };
  expect(attendance.status).toMatch(/PRESENT|LATE/);
  const listing = await request.get(`/api/v1/attendance?classSessionId=${sessionId}`, { headers: teacher });
  expect(listing.status()).toBe(200);
  expect((await listing.json()).some((row: { id: number }) => row.id === attendance.id)).toBe(true);
});
