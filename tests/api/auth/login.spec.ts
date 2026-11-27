import { test, expect } from '@playwright/test';
import { postJson } from '../../helpers/api';
import { apiUsers } from '../../fixtures/users';

type Login = { accessToken: string; roles: string[]; email: string; id: number };

test.describe('Auth API', () => {
  test('valid credentials return a JWT and role list without password fields', async ({ request }) => {
    const { res, body } = await postJson<Login>(request, '/auth/login', apiUsers.admin);
    expect(res.status()).toBe(200);
    expect(body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(body.roles).toContain('ADMIN');
    expect(body.email).toBe(apiUsers.admin.email);
    expect(await res.text()).not.toMatch(/password(_hash)?/i);
  });

  test('wrong and unknown credentials are rejected uniformly', async ({ request }) => {
    const wrong = await postJson(request, '/auth/login', { email: apiUsers.admin.email, password: 'wrong-password' });
    const missing = await postJson(request, '/auth/login', { email: 'missing@smartcampus.test', password: 'wrong-password' });
    expect(wrong.res.status()).toBe(401);
    expect(missing.res.status()).toBe(401);
    expect(wrong.body).toEqual(missing.body);
  });

  test('missing required fields return 400', async ({ request }) => {
    for (const data of [{}, { email: apiUsers.admin.email }]) {
      const { res } = await postJson(request, '/auth/login', data);
      expect(res.status()).toBe(400);
    }
  });

  test('student receives STUDENT role', async ({ request }) => {
    const { res, body } = await postJson<Login>(request, '/auth/login', apiUsers.student);
    expect(res.status()).toBe(200);
    expect(body.roles).toContain('STUDENT');
  });
});
