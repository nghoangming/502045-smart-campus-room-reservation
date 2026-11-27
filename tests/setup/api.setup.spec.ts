import { test, expect } from '@playwright/test';
import { apiUsers } from '../fixtures/users';

/** Validate prerequisites through read-only application APIs; never seed or mutate the database. */
test('API test environment has an admin and rooms for both booking categories', async ({ request }) => {
  const login = await request.post('/api/v1/auth/login', { data: apiUsers.admin });
  expect(login.status(), 'API test admin account must already exist in the configured database').toBe(200);
  const { accessToken } = await login.json() as { accessToken: string };
  const response = await request.get('/api/v1/rooms', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(response.status()).toBe(200);
  const rooms = await response.json() as Array<{ type: string }>;
  expect(rooms.some((room) => room.type === 'LAB' || room.type === 'THEORY'),
    'the configured database must already contain a classroom room').toBe(true);
  expect(rooms.some((room) => room.type === 'SELF_STUDY'),
    'the configured database must already contain a study room').toBe(true);
});
