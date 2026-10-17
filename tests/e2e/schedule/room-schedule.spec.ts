import { test, expect } from '@playwright/test';
import { loginAsAdminUi } from '../../helpers/auth';

test.describe('Room Schedule (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminUi(page);
    await page.goto('/roomschedule');
    await page.locator('input[type="date"]').fill('2026-10-16');
  });

  test('hiển thị tiêu đề và bảng lịch', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Room Schedule' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Room' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    // mặc định "All Rooms": 6 phòng
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });

  test('lọc theo phòng chỉ còn đúng 1 dòng', async ({ page }) => {
    await page.locator('select').selectOption('A101');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr').first()).toContainText('A101');
  });

  test('phòng không có lớp hiển thị trạng thái Available', async ({ page }) => {
    await page.locator('select').selectOption('C302');
    await expect(page.locator('tbody tr').first()).toContainText('Available');
  });

  test('đổi ngày cập nhật tiêu đề Schedule', async ({ page }) => {
    await page.locator('input[type="date"]').fill('2026-10-20');
    await expect(page.getByRole('heading', { name: 'Schedule: 2026-10-20' })).toBeVisible();
  });

  test('phòng trống phản ánh booking và trạng thái bảo trì từ database', async ({ page }) => {
    const available = page.getByRole('region', { name: 'Available rooms', exact: true });
    await expect(available.getByRole('listitem')).toHaveCount(3);
    await expect(available).toContainText('C301');
    await expect(available).not.toContainText('A101');
    await expect(available).not.toContainText('B202');
    await page.getByLabel('Start time').fill('10:00');
    await page.getByLabel('End time').fill('11:00');
    await expect(available).toContainText('A101');
    await expect(available).not.toContainText('A102');
  });
});
