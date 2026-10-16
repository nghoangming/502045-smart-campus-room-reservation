import { test, expect } from '@playwright/test';
import { users } from '../../fixtures/users';

test.describe('Đăng nhập (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('hiển thị form đăng nhập', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  test('đăng nhập đúng chuyển sang /dashboard và lưu trạng thái đăng nhập', async ({ page }) => {
    await page.getByLabel('Username').fill(users.admin.username);
    await page.getByLabel('Password', { exact: true }).fill(users.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const flag = await page.evaluate(() => localStorage.getItem('smartCampusLoggedIn'));
    expect(flag).toBe('true');
  });

  test('sai mật khẩu hiện thông báo lỗi và ở lại trang login', async ({ page }) => {
    await page.getByLabel('Username').fill(users.admin.username);
    await page.getByLabel('Password', { exact: true }).fill(users.invalid.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toContainText('Incorrect username or password');
    await expect(page).toHaveURL(/\/login$/);
    const flag = await page.evaluate(() => localStorage.getItem('smartCampusLoggedIn'));
    expect(flag).toBeNull();
  });

  test('sai username hiện thông báo lỗi', async ({ page }) => {
    await page.getByLabel('Username').fill(users.invalid.username);
    await page.getByLabel('Password', { exact: true }).fill(users.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toContainText('Incorrect username or password');
  });

  test('để trống cả hai ô hiện thông báo yêu cầu nhập', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toContainText('Please enter both username and password');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('chỉ nhập username, thiếu password hiện thông báo yêu cầu nhập', async ({ page }) => {
    await page.getByLabel('Username').fill(users.admin.username);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toContainText('Please enter both username and password');
  });

  test('nút Show/Hide đổi kiểu hiển thị mật khẩu', async ({ page }) => {
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('abc123');
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Show' }).click();
    await expect(password).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Hide' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('đường dẫn không tồn tại được chuyển về trang login', async ({ page }) => {
    await page.goto('/duong-dan-khong-ton-tai');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });
});
