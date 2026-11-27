import { test, expect } from '@playwright/test';
import { postJson } from '../../helpers/api';
import { authHeaders, studentHeaders } from '../../helpers/api-auth';
import { apiUsers } from '../../fixtures/users';

const sessionId = process.env.TEST_QR_CLASS_SESSION_ID;
const wrongSessionId = process.env.TEST_QR_WRONG_CLASS_SESSION_ID;
const validCode = process.env.TEST_QR_VALID_CODE;
const expiredCode = process.env.TEST_QR_EXPIRED_CODE;

test.describe('QR attendance API', () => {
  test('valid manual code checks in the student for the configured class session', async ({ request }) => {
    test.skip(!sessionId || !validCode, 'Configure a current QR fixture and confirmed student seat.');
    const headers = await studentHeaders(request);
    const { res, body } = await postJson<{ classSessionId: number; status: string }>(request, '/attendance/check-in', {
      qrCode: validCode, classSessionId: Number(sessionId),
    }, headers);
    expect(res.status()).toBe(201);
    expect(String(body.classSessionId)).toBe(sessionId);
  });

  test('invalid QR code is rejected', async ({ request }) => {
    test.skip(!sessionId, 'Configure TEST_QR_CLASS_SESSION_ID for attendance API checks.');
    const headers = await studentHeaders(request);
    const { res } = await postJson(request, '/attendance/check-in', {
      qrCode: `INVALID-${Date.now()}`, classSessionId: Number(sessionId),
    }, headers);
    expect(res.status()).toBe(400);
  });

  test('expired QR code is rejected', async ({ request }) => {
    test.skip(!sessionId || !expiredCode, 'Configure a previously issued expired check-in code.');
    const headers = await studentHeaders(request);
    const { res } = await postJson(request, '/attendance/check-in', {
      qrCode: expiredCode, classSessionId: Number(sessionId),
    }, headers);
    expect(res.status()).toBe(400);
  });

  test('a code issued for another class session is rejected', async ({ request }) => {
    test.skip(!wrongSessionId || !validCode, 'Configure two class sessions and a valid code for the first.');
    const headers = await authHeaders(request, apiUsers.student2);
    const { res } = await postJson(request, '/attendance/check-in', {
      qrCode: validCode, classSessionId: Number(wrongSessionId),
    }, headers);
    expect(res.status()).toBe(400);
  });

  test('requires classSessionId and a non-blank code', async ({ request }) => {
    const headers = await studentHeaders(request);
    const missingSession = await postJson(request, '/attendance/check-in', { qrCode: 'INVALID-CODE' }, headers);
    expect(missingSession.res.status()).toBe(400);
    const blankCode = await postJson(request, '/attendance/check-in', { qrCode: ' ', classSessionId: 999999999 }, headers);
    expect(blankCode.res.status()).toBe(400);
  });

  test('requires authentication for check-in', async ({ request }) => {
    const { res } = await postJson(request, '/attendance/check-in', { qrCode: 'INVALID-CODE', classSessionId: 1 });
    expect(res.status()).toBe(401);
  });
});
