import { test, expect } from '@playwright/test';
import { loginWorkspace } from './support/workspace';

const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

test.describe('Luồng nghiệp vụ trên giao diện', () => {
  test('sinh viên đặt rồi hủy phòng tự học', async ({ page }) => {
    await loginWorkspace(page, 'STUDENT');
    await page.getByRole('navigation').getByRole('button', { name: 'Đặt phòng tự học' }).click();
    await page.getByRole('button', { name: /C301/ }).click();
    await page.getByLabel('Ngày sử dụng').fill(tomorrow());
    await page.getByLabel('Bắt đầu').fill('08:00');
    await page.getByLabel('Kết thúc').fill('09:00');
    await page.getByRole('button', { name: /Đặt phòng C301/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Đã gửi yêu cầu đặt phòng tự học.')).toBeVisible();
    await page.getByRole('button', { name: 'Hủy lịch đặt' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Đã hủy lịch đặt phòng tự học.')).toBeVisible();
  });

  test('sinh viên chọn và hủy ghế cho buổi học', async ({ page }) => {
    await loginWorkspace(page, 'STUDENT');
    await page.getByRole('navigation').getByRole('button', { name: 'Tìm chỗ ngồi' }).click();
    const seat = page.getByRole('button', { name: 'Ghế 1: còn trống' });
    await expect(seat).toBeVisible();
    await seat.click();
    await page.getByRole('button', { name: 'Xác nhận ghế' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Ghế của bạn: 1')).toBeVisible();
    await page.getByRole('button', { name: 'Hủy chỗ của tôi' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Đã hủy lượt đặt ghế.')).toBeVisible();
  });

  test('sinh viên check-in bằng mã QR nhập thủ công', async ({ page }) => {
    await loginWorkspace(page, 'STUDENT', { seatReserved: true });
    await page.getByRole('navigation').getByRole('button', { name: 'Check-in QR' }).click();
    await page.getByLabel('Mã QR / mã nhập thủ công').fill('E2E-QR-TOKEN');
    await page.getByRole('button', { name: 'Xác nhận check-in' }).click();
    await expect(page.getByText(/Đã điểm danh thành công lúc/)).toBeVisible();
  });

  test('giảng viên gửi yêu cầu đặt phòng và tạo buổi học', async ({ page }) => {
    await loginWorkspace(page, 'TEACHER');
    await page.getByRole('navigation').getByRole('button', { name: 'Đặt phòng' }).click();
    await page.getByLabel('Ngày sử dụng').fill(tomorrow());
    await page.getByLabel('Mã học phần').fill('IT999');
    await page.getByLabel('Học phần / mục đích').fill('E2E booking workflow');
    await page.getByLabel('Phòng phù hợp (1)').selectOption('2');
    await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Đã tạo lịch phòng và buổi học qua API.')).toBeVisible();
  });

  test('giảng viên tạo mã QR trong cửa sổ điểm danh', async ({ page }) => {
    await loginWorkspace(page, 'TEACHER');
    await page.getByRole('navigation').getByRole('button', { name: 'Điểm danh' }).click();
    const generate = page.getByRole('button', { name: 'Tạo mã QR' });
    await expect(generate).toBeEnabled();
    await generate.click();
    await expect(page.getByText('E2E-QR-TOKEN')).toBeVisible();
  });

  test('giảng viên gửi báo cáo sự cố', async ({ page }) => {
    await loginWorkspace(page, 'TEACHER');
    await page.getByRole('navigation').getByRole('button', { name: 'Báo cáo sự cố' }).click();
    await page.getByLabel('Mô tả').fill('Máy chiếu không lên hình trong buổi học E2E.');
    await page.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Đã gửi báo cáo sự cố.')).toBeVisible();
    await expect(page.getByText('Máy chiếu không lên hình trong buổi học E2E.')).toBeVisible();
  });

  test('admin duyệt yêu cầu đặt phòng', async ({ page }) => {
    await loginWorkspace(page, 'ADMIN', { initialPendingBooking: true });
    await page.getByRole('navigation').getByRole('button', { name: 'Yêu cầu đặt phòng' }).click();
    const row = page.getByRole('row').filter({ hasText: '#78' });
    await row.getByRole('button', { name: 'Kiểm tra' }).click();
    await page.getByRole('button', { name: 'Duyệt yêu cầu', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Đã duyệt yêu cầu #78 trên backend.')).toBeVisible();
  });

  test('admin cập nhật và xóa thiết bị của phòng', async ({ page }) => {
    await loginWorkspace(page, 'ADMIN');
    await page.getByRole('navigation').getByRole('button', { name: 'Phòng & thiết bị' }).click();
    const card = page.locator('.ws-room-card').filter({ hasText: 'Phòng lý thuyết' });
    await card.getByRole('button', { name: 'Xem chi tiết & thiết bị' }).click();
    await page.locator('summary').filter({ hasText: 'Thiết bị & tài nguyên' }).click();
    await page.getByLabel('Tên thiết bị').fill('Máy chiếu UI');
    await page.getByLabel('Số lượng').fill('2');
    await page.getByRole('button', { name: 'Thêm thiết bị' }).click();
    const resourceRow = page.locator('.ws-resource-row').filter({ hasText: 'Máy chiếu UI' });
    await expect(resourceRow).toBeVisible();
    await resourceRow.getByLabel('Trạng thái Máy chiếu UI').selectOption('MAINTENANCE');
    await resourceRow.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(resourceRow).toContainText('Bảo trì');
    await resourceRow.getByRole('button', { name: 'Xóa thiết bị Máy chiếu UI' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa vĩnh viễn' }).click();
    await expect(page.locator('.ws-resource-row').filter({ hasText: 'Máy chiếu UI' })).toHaveCount(0);
  });

  test('admin xem và đánh dấu tất cả thông báo đã đọc', async ({ page }) => {
    await loginWorkspace(page, 'ADMIN', { initialNotification: true });
    await page.getByRole('button', { name: 'Thông báo: 1 chưa đọc' }).click();
    await expect(page.getByRole('region', { name: 'Thông báo của tôi' })).toBeVisible();
    await page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
    await expect(page.getByText('0 chưa đọc · 1 thông báo')).toBeVisible();
  });

  test('admin chuyển báo cáo sự cố sang đã xử lý', async ({ page }) => {
    await loginWorkspace(page, 'ADMIN', { initialIncident: true });
    await page.getByRole('navigation').getByRole('button', { name: 'Sự cố' }).click();
    const incident = page.locator('.ws-incident-card').filter({ hasText: 'Máy chiếu không lên hình khi bắt đầu buổi học.' });
    await incident.getByLabel('Trạng thái').selectOption('RESOLVED');
    await incident.getByRole('button', { name: 'Lưu xử lý' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Đã cập nhật sự cố trên hệ thống.')).toBeVisible();
    await expect(incident).toContainText('Đã xử lý');
  });
});
