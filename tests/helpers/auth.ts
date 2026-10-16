import { Page, expect } from '@playwright/test';
import { users } from '../fixtures/users';

/** Đăng nhập qua giao diện bằng tài khoản admin demo. */
export async function loginAsAdminUi(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(users.admin.username);
  await page.getByLabel('Password', { exact: true }).fill(users.admin.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
