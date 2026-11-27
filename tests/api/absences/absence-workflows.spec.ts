import { test, expect } from '@playwright/test';
import { authHeaders } from '../../helpers/api-auth';
import { apiUsers } from '../../fixtures/users';
import { createApprovedClassSession, reserveStudentSeat } from '../../helpers/booking-scenarios';

test.describe('Absence workflow', () => {
  test('student submits an absence request and teacher approves it', async ({ request }) => {
    const scenario = await createApprovedClassSession(request, 'student absence');
    const { student } = await reserveStudentSeat(request, scenario.sessionId);
    const teacher = scenario.teacher;
    const created = await request.post(`/api/v1/absence-requests/class-sessions/${scenario.sessionId}`, {
      headers: student, data: { reason: `Playwright absence ${Date.now()}` },
    });
    expect(created.status()).toBe(201);
    const absence = await created.json() as { id: number; status: string; classSessionId: number };
    expect(absence.status).toBe('PENDING');
    const reviewed = await request.patch(`/api/v1/absence-requests/${absence.id}`, {
      headers: teacher, data: { approve: true, note: 'Approved by API test' },
    });
    expect(reviewed.status()).toBe(200);
    expect((await reviewed.json()).status).toBe('APPROVED');
  });

  test('teacher reports absence and admin decides it', async ({ request }) => {
    const scenario = await createApprovedClassSession(request, 'teacher absence');
    const teacher = scenario.teacher;
    const admin = await authHeaders(request, apiUsers.admin);
    const report = await request.patch(`/api/v1/class-sessions/${scenario.sessionId}/absence?reason=Playwright%20test`, { headers: teacher });
    expect(report.status()).toBe(200);
    const decision = await request.patch(`/api/v1/class-sessions/${scenario.sessionId}/absence/approve`, { headers: admin });
    expect(decision.status()).toBe(200);
  });
});
