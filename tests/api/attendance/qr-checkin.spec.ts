import { test, expect } from '@playwright/test';
import { postJson } from '../../helpers/api';
import { pending } from '../../helpers/pending';

const validQrCode = process.env.TEST_QR_VALID_CODE ?? '';
const expiredQrCode = process.env.TEST_QR_EXPIRED_CODE ?? '';
const classSessionId = Number(process.env.TEST_CLASS_SESSION_ID ?? 0);
const otherClassSessionId = Number(process.env.TEST_OTHER_CLASS_SESSION_ID ?? 0);

/**
 * Based on docs/architecture/openapi-spec.yaml:
 * POST /attendance/check-in { qrCode, classSessionId }
 * 201 valid check-in, 400 invalid/expired payload or QR, 409 class/session conflict.
 * A valid QR and seeded class session must be supplied by the test environment.
 */
pending('Attendance QR check-in – tuần 5 (chờ API M2/M3)', () => {
  test('QR hợp lệ của đúng lớp ghi nhận attendance', async ({ request }) => {
    test.skip(!validQrCode || !classSessionId, 'Cần TEST_QR_VALID_CODE và TEST_CLASS_SESSION_ID');
    const { res, body } = await postJson<{
      id: string | number;
      status: string;
      checkedInAt?: string;
    }>(request, '/attendance/check-in', { qrCode: validQrCode, classSessionId });

    expect(res.status()).toBe(201);
    expect(body.id).toBeDefined();
    expect(['PRESENT', 'LATE']).toContain(body.status);
    expect(body.checkedInAt).toBeTruthy();
  });

  test('QR không hợp lệ bị từ chối', async ({ request }) => {
    test.skip(!classSessionId, 'Cần TEST_CLASS_SESSION_ID để phân biệt QR sai với session không tồn tại');
    const { res } = await postJson(request, '/attendance/check-in', {
      qrCode: 'invalid-qr-code',
      classSessionId,
    });
    expect(res.status()).toBe(400);
  });

  test('QR hết hạn bị từ chối', async ({ request }) => {
    test.skip(!expiredQrCode || !classSessionId, 'Cần TEST_QR_EXPIRED_CODE và TEST_CLASS_SESSION_ID');
    const { res } = await postJson(request, '/attendance/check-in', {
      qrCode: expiredQrCode,
      classSessionId,
    });
    expect(res.status()).toBe(400);
  });

  test('QR thuộc lớp khác bị từ chối', async ({ request }) => {
    test.skip(!validQrCode || !otherClassSessionId, 'Cần TEST_QR_VALID_CODE và TEST_OTHER_CLASS_SESSION_ID');
    const { res } = await postJson(request, '/attendance/check-in', {
      qrCode: validQrCode,
      classSessionId: otherClassSessionId,
    });
    expect(res.status()).toBe(409);
  });
});
