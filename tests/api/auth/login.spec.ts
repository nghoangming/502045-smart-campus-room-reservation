import { test, expect } from '@playwright/test';
import { postJson } from '../../helpers/api';
import { pending } from '../../helpers/pending';
import { apiUsers } from '../../fixtures/users';

/**
 * Hợp đồng GIẢ ĐỊNH (cần chốt với M2/M3 — JWT + RBAC):
 *   POST /api/v1/auth/login   body { email, password }
 *   200 -> { token: string, user: { role } }
 *   400 -> thiếu email/password
 *   401 -> sai email hoặc mật khẩu
 * Hiện tại backend CHƯA có endpoint này (frontend đang kiểm tra admin/admin123 cứng).
 */
pending('Auth API @pending (chờ M2 implement POST /auth/login + M3 seed users)', () => {
  test('đăng nhập đúng trả 200 kèm token JWT', async ({ request }) => {
    const { res, body } = await postJson<{ token: string }>(request, '/auth/login', apiUsers.admin);
    expect(res.status()).toBe(200);
    expect(body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // header.payload.signature
  });

  test('response không lộ password hay password_hash', async ({ request }) => {
    const { res } = await postJson(request, '/auth/login', apiUsers.admin);
    const text = await res.text();
    expect(text).not.toContain('password');
  });

  test('sai mật khẩu trả 401', async ({ request }) => {
    const { res } = await postJson(request, '/auth/login', { email: apiUsers.admin.email, password: 'sai-mat-khau' });
    expect(res.status()).toBe(401);
  });

  test('email không tồn tại trả 401 (không tiết lộ email có tồn tại hay không)', async ({ request }) => {
    const wrongPw = await postJson<{ message?: string }>(request, '/auth/login', {
      email: apiUsers.admin.email,
      password: 'sai-mat-khau',
    });
    const noUser = await postJson<{ message?: string }>(request, '/auth/login', {
      email: 'khong.ton.tai@smartcampus.test',
      password: 'bat-ky',
    });
    expect(noUser.res.status()).toBe(401);
    expect(noUser.body?.message).toBe(wrongPw.body?.message);
  });

  test('thiếu password trả 400', async ({ request }) => {
    const { res } = await postJson(request, '/auth/login', { email: apiUsers.admin.email });
    expect(res.status()).toBe(400);
  });

  test('body rỗng trả 400', async ({ request }) => {
    const { res } = await postJson(request, '/auth/login', {});
    expect(res.status()).toBe(400);
  });

  test('student đăng nhập được và nhận role STUDENT', async ({ request }) => {
    const { res, body } = await postJson<{ user: { role: string } }>(request, '/auth/login', apiUsers.student);
    expect(res.status()).toBe(200);
    expect(body.user.role).toBe('STUDENT');
  });
});
