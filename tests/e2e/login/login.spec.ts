import { test, expect } from '@playwright/test';
import { mockWorkspaceApi, sessionKey } from '../../helpers/auth';

const studentEmail = 'student@smartcampus.test';
const password = 'password123';

test.describe('Đăng nhập (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorkspaceApi(page, 'STUDENT');
    await page.goto('/login');
  });

  test('hiển thị form email, mật khẩu và lựa chọn vai trò', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Chào mừng trở lại.' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Nhập mật khẩu')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Chọn vai trò' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });

  test('đăng nhập sinh viên mở workspace và lưu phiên', async ({ page }) => {
    await page.getByLabel('Email').fill(studentEmail);
    await page.getByPlaceholder('Nhập mật khẩu').fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).toHaveURL(/\/student$/);
    await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();
    const session = await page.evaluate((key) => sessionStorage.getItem(key), sessionKey);
    expect(JSON.parse(session!).account.role).toBe('STUDENT');
  });

  test('sai thông tin xác thực hiện lỗi từ API', async ({ page }) => {
    await page.unroute('**/api/v1/**');
    await page.route('**/api/v1/**', async (route) => {
      if (new URL(route.request().url()).pathname.endsWith('/auth/login')) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Email hoặc mật khẩu không đúng.' }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });
    await page.getByLabel('Email').fill(studentEmail);
    await page.getByPlaceholder('Nhập mật khẩu').fill('wrong-password');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.locator('.auth-error')).toContainText('Email hoặc mật khẩu không đúng.');
    expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull();
  });

  test('không cho submit khi thiếu email hoặc mật khẩu', async ({ page }) => {
    const email = page.getByLabel('Email');
    const submit = page.getByRole('button', { name: 'Đăng nhập' });
    await submit.click();
    expect(await email.evaluate((element) => (element as HTMLInputElement).validity.valid)).toBe(false);
    await email.fill(studentEmail);
    await submit.click();
    expect(await page.getByPlaceholder('Nhập mật khẩu').evaluate((element) => (element as HTMLInputElement).validity.valid)).toBe(false);
  });

  test('nút hiển thị mật khẩu đổi kiểu input', async ({ page }) => {
    const input = page.getByPlaceholder('Nhập mật khẩu');
    await input.fill(password);
    await expect(input).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Hiện mật khẩu' }).click();
    await expect(input).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ẩn mật khẩu' }).click();
    await expect(input).toHaveAttribute('type', 'password');
  });

  test('admin vào trang đăng nhập quản trị riêng', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: 'Chào mừng Quản trị viên.' })).toBeVisible();
    await expect(page.getByText('Khu vực dành riêng cho Quản trị viên')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Chọn vai trò' })).toHaveCount(0);
  });

  test('route không tồn tại hiển thị trang 404 của Next.js', async ({ page }) => {
    await page.goto('/duong-dan-khong-ton-tai');
    await expect(page.getByText('This page could not be found.')).toBeVisible();
  });
});
