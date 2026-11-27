import { test, expect } from '@playwright/test';
import { loginAsRoleUi } from '../../helpers/auth';

test.describe('Lịch sinh viên (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoleUi(page, 'STUDENT');
    await page.getByRole('navigation', { name: 'Điều hướng theo vai trò' }).getByRole('button', { name: 'Lịch của tôi' }).click();
  });

  test('mở lịch tuần và hiển thị trạng thái khi chưa có buổi học', async ({ page }) => {
    await expect(page.getByText('Lịch học', { exact: true })).toBeVisible();
    await expect(page.getByText('LỊCH TRONG NGÀY')).toBeVisible();
    await expect(page.getByText('Không có buổi học trong ngày này.')).toBeVisible();
  });

  test('đổi tuần cập nhật ngày đang chọn', async ({ page }) => {
    const date = page.getByLabel('Chọn ngày để xem lịch');
    const initial = await date.inputValue();
    await page.getByRole('button', { name: 'Tuần sau' }).click();
    await expect(date).not.toHaveValue(initial);
  });
});
