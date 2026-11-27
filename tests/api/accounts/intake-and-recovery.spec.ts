import { test, expect } from '@playwright/test';
import { adminHeaders } from '../../helpers/api-auth';

test.describe('Student intake and account recovery contracts', () => {
  test('admin CSV import rejects a file without required Google Form columns', async ({ request }) => {
    const headers = await adminHeaders(request);
    const response = await request.post('/api/v1/intake/students/import', {
      headers, multipart: { file: { name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from('name,email\nTest,test@example.com\n') } },
    });
    expect(response.status()).toBe(400);
  });

  test('activation rejects an invalid token', async ({ request }) => {
    const response = await request.post('/api/v1/auth/activate', { data: { token: 'invalid-test-token', password: 'StrongPassword@123' } });
    expect([400, 404, 422]).toContain(response.status());
  });

  test('forgot password responds uniformly for an unknown address', async ({ request }) => {
    const response = await request.post('/api/v1/auth/forgot-password', {
      data: { personalEmail: `unknown-${Date.now()}@example.invalid` },
    });
    expect(response.status()).toBe(204);
  });
});
