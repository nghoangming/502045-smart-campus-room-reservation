import { test, expect } from '@playwright/test';
import { getJson, postJson } from '../../helpers/api';
import { authHeaders } from '../../helpers/api-auth';
import { apiUsers } from '../../fixtures/users';
import { createApprovedClassSession } from '../../helpers/booking-scenarios';

test.describe('Seat reservation concurrency', () => {
  test('two students racing for one seat produce exactly one successful response', async ({ request }) => {
    test.skip(!process.env.TEST_STUDENT2_EMAIL, 'Set TEST_STUDENT2_EMAIL/PASSWORD to enable two-account concurrency coverage.');
    const { sessionId } = await createApprovedClassSession(request, 'seat concurrency');
    const studentA = await authHeaders(request, apiUsers.student);
    const studentB = await authHeaders(request, apiUsers.student2);
    const seats = await getJson<Array<{ id: number }>>(request, `/class-sessions/${sessionId}/seats`, studentA);
    expect(seats.res.status()).toBe(200);
    const seatId = seats.body[0].id;
    const responses = await Promise.all([
      postJson(request, '/seat-reservations', { classSessionId: sessionId, seatId }, studentA),
      postJson(request, '/seat-reservations', { classSessionId: sessionId, seatId }, studentB),
    ]);
    expect(responses.filter((result) => result.res.status() === 201)).toHaveLength(1);
    expect(responses.filter((result) => [409, 422].includes(result.res.status()))).toHaveLength(1);
  });
});
