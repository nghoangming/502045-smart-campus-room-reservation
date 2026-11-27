import { test, expect } from '@playwright/test';

const email = process.env.TEST_STUDENT_EMAIL;
const password = process.env.TEST_STUDENT_PASSWORD;

test('student logs in and opens live room and schedule data', async ({ page }) => {
  test.skip(!email || !password, 'Configure TEST_STUDENT_EMAIL and TEST_STUDENT_PASSWORD for live E2E.');
  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByPlaceholder('Nhập mật khẩu').fill(password!);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();

  await page.getByRole('navigation', { name: 'Điều hướng theo vai trò' })
    .getByRole('button', { name: 'Đặt phòng tự học' }).click();
  await expect(page.getByRole('button', { name: /^C\d{3}\b/ }).first()).toBeVisible();

  await page.getByRole('navigation', { name: 'Điều hướng theo vai trò' })
    .getByRole('button', { name: 'Lịch của tôi' }).click();
  await expect(page.getByText('Lịch học', { exact: true })).toBeVisible();
});

test('student books and cancels a study room through the live backend', async ({ page }) => {
  test.skip(!email || !password, 'Configure TEST_STUDENT_EMAIL and TEST_STUDENT_PASSWORD for live E2E.');
  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByPlaceholder('Nhập mật khẩu').fill(password!);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/student$/);
  await page.getByRole('navigation', { name: 'Điều hướng theo vai trò' })
    .getByRole('button', { name: 'Đặt phòng tự học' }).click();
  const room = page.getByRole('button', { name: /^C\d{3}\b/ }).first();
  await expect(room).toBeVisible();
  await room.click();
  const date = new Date();
  date.setDate(date.getDate() + 45);
  await page.getByLabel('Ngày sử dụng').fill(date.toISOString().slice(0, 10));
  await page.getByLabel('Bắt đầu').fill('08:00');
  await page.getByLabel('Kết thúc').fill('09:00');
  await page.getByRole('button', { name: /Đặt phòng C\d{3}/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByText('Đã gửi yêu cầu đặt phòng tự học.')).toBeVisible();
  await page.getByRole('button', { name: 'Hủy lịch đặt' }).first().click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByText('Đã hủy lịch đặt phòng tự học.')).toBeVisible();
});

test('teacher reports an incident and admin resolves it through the live backend', async ({ page, context }) => {
  const teacherEmail = process.env.TEST_TEACHER_EMAIL;
  const teacherPassword = process.env.TEST_TEACHER_PASSWORD;
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;
  test.skip(!teacherEmail || !teacherPassword || !adminEmail || !adminPassword,
    'Configure teacher and admin test accounts for live E2E.');
  const description = `Playwright live incident ${Date.now()}: projector not working.`;
  await page.goto('/login');
  await page.getByRole('group', { name: 'Chọn vai trò' }).getByRole('button', { name: 'Giảng viên' }).click();
  await page.getByLabel('Email').fill(teacherEmail!);
  await page.getByPlaceholder('Nhập mật khẩu').fill(teacherPassword!);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  await page.getByRole('navigation').getByRole('button', { name: 'Báo cáo sự cố' }).click();
  await page.getByLabel('Mô tả').fill(description);
  await page.getByRole('button', { name: 'Gửi báo cáo' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByText('Đã gửi báo cáo sự cố.')).toBeVisible();

  const admin = await context.newPage();
  await admin.goto('/admin/login');
  await admin.getByLabel('Email').fill(adminEmail!);
  await admin.getByPlaceholder('Nhập mật khẩu').fill(adminPassword!);
  await admin.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(admin).toHaveURL(/\/admin$/);
  await admin.getByRole('navigation').getByRole('button', { name: 'Sự cố' }).click();
  const incident = admin.locator('.ws-incident-card').filter({ hasText: description });
  await expect(incident).toBeVisible();
  await incident.getByLabel('Trạng thái').selectOption('RESOLVED');
  await incident.getByRole('button', { name: 'Lưu xử lý' }).click();
  await admin.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
  await expect(admin.getByText('Đã cập nhật sự cố trên hệ thống.')).toBeVisible();
  await expect(incident).toContainText('Đã xử lý');
});

test('admin creates, changes status, and removes a resource through the live backend', async ({ page }) => {
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;
  test.skip(!adminEmail || !adminPassword, 'Configure admin test account for live E2E.');
  const resourceName = `PW-${Date.now().toString().slice(-10)}`;
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(adminEmail!);
  await page.getByPlaceholder('Nhập mật khẩu').fill(adminPassword!);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('navigation').getByRole('button', { name: 'Phòng & thiết bị' }).click();
  await page.locator('.ws-room-card').first().getByRole('button', { name: 'Xem chi tiết & thiết bị' }).click();
  await page.locator('summary').filter({ hasText: 'Thiết bị & tài nguyên' }).click();
  await page.getByLabel('Tên thiết bị').fill(resourceName);
  await page.getByLabel('Số lượng').fill('2');
  await page.getByRole('button', { name: 'Thêm thiết bị' }).click();
  const row = page.locator('.ws-resource-row').filter({ hasText: resourceName });
  await expect(row).toBeVisible();
  await row.getByLabel(`Trạng thái ${resourceName}`).selectOption('MAINTENANCE');
  await row.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(row).toContainText('Bảo trì');
  await row.getByRole('button', { name: `Xóa thiết bị ${resourceName}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa vĩnh viễn' }).click();
  await expect(page.locator('.ws-resource-row').filter({ hasText: resourceName })).toHaveCount(0);
});
