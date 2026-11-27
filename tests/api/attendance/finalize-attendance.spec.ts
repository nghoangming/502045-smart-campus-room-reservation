import { test, expect } from '@playwright/test';
import { authHeaders } from '../../helpers/api-auth';

test('teacher finalizes attendance after the QR check-in window closes', async ({ request }) => {
  const sessionId = process.env.TEST_FINALIZE_CLASS_SESSION_ID || process.env.TEST_QR_WORKFLOW_SESSION_ID;
  test.skip(!sessionId, 'Set TEST_FINALIZE_CLASS_SESSION_ID to a confirmed session whose check-in window has closed.');
  const teacher = await authHeaders(request, {
    email: process.env.TEST_TEACHER_EMAIL || 'teacher@smartcampus.test',
    password: process.env.TEST_TEACHER_PASSWORD || 'Teacher@123',
  });
  const sessionResponse = await request.get(`/api/v1/class-sessions/${sessionId}`, { headers: teacher });
  expect(sessionResponse.status()).toBe(200);
  const session = await sessionResponse.json() as { startTime: string; endTime: string };
  const elapsed = Date.now() - new Date(session.startTime).getTime();
  const ended = Date.now() >= new Date(session.endTime).getTime();
  test.skip(elapsed < 20 * 60_000 && !ended, 'Attendance can only be finalized after the 20-minute check-in window closes.');
  const finalized = await request.post(`/api/v1/class-sessions/${sessionId}/attendance/finalize`, { headers: teacher });
  expect(finalized.status()).toBe(200);
  expect((await finalized.json()).classSessionId).toBe(Number(sessionId));
});
