import { expect, Page } from '@playwright/test';

type WorkspaceRole = 'ADMIN' | 'TEACHER' | 'STUDENT';
const sessionKey = 'tdtu-campus-auth-session';

export async function mockWorkspaceApi(page: Page, role: WorkspaceRole = 'STUDENT') {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test.header.signature',
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          id: 12,
          name: 'Playwright User',
          email: 'playwright@smartcampus.test',
          roles: [role],
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

export async function loginAsRoleUi(page: Page, role: WorkspaceRole = 'STUDENT') {
  await mockWorkspaceApi(page, role);
  await page.goto('/login');
  if (role === 'TEACHER') {
    await page.getByRole('group', { name: 'Chọn vai trò' }).getByRole('button', { name: 'Giảng viên' }).click();
  }
  await page.getByLabel('Email').fill('playwright@smartcampus.test');
  await page.getByPlaceholder('Nhập mật khẩu').fill('password123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(new RegExp(`/${role.toLowerCase()}$`));
}

export { sessionKey };
