# Tests (Playwright)

Bộ API/E2E test cho Smart Campus. Test không tạo hoặc sửa schema/database; API tests dùng database đã được cấu hình và chỉ tạo dữ liệu nghiệp vụ cần cho các flow kiểm thử.

## Yêu cầu

- Node.js 20+
- Backend đang chạy tại `API_URL` (mặc định `http://localhost:8080`)
- Database backend đã có migrations và tài khoản demo admin/teacher/student; có phòng lớp học và phòng SELF_STUDY

## Cài đặt

```bash
cd frontend
npm ci
cd ../tests
npm ci
npx playwright install chromium
```

## Chạy

```bash
npm test
npm run test:api
npm run test:e2e
npx playwright test --project=e2e-live
npm run report
```

`test:api` chạy trước `api-setup`, kiểm tra đăng nhập admin và dữ liệu phòng bắt buộc bằng GET. Nó không migrate schema. Trước khi chạy API suite, provision fixture QR/session:

```powershell
.\scripts\provision-attendance-fixtures.ps1
npm run test:api
```

Script cần `psql`, test DB và tài khoản demo/room types đã có. Script chỉ thêm dữ liệu nghiệp vụ, bao gồm tài khoản phụ `teacher2@smartcampus.test`, booking/session/seat/challenge kiểm thử; không thay schema. Nó ghi fixture ID/code vào `.env`. Chạy suite ngay sau provisioning: mã QR hợp lệ hết hạn sau 2 phút, còn session workflow chỉ dùng được từ phút 5 đến trước phút 20. Không chạy trên production DB.

`test:e2e` tự chạy frontend qua `webServer`; có thể đặt `SKIP_WEB_SERVER=true` nếu frontend đã chạy. Các browser workflow dùng API responses được mock để kiểm tra hành vi UI; integration với backend thật được kiểm tra riêng trong project `api`.

`e2e-live` chạy Chromium với frontend và backend thật. Cần tài khoản test student, teacher và admin, `BASE_URL` trỏ frontend và frontend proxy `/api/v1` tới backend đang chạy. Bốn ca kiểm tra đăng nhập/xem phòng-lịch, đặt/hủy phòng, báo cáo/xử lý sự cố và CRUD tài nguyên; test chọn phòng theo dữ liệu hiện có thay vì hard-code ID. CI API job chạy project này sau API suite với `BACKEND_URL=http://localhost:8080`.

## Biến môi trường API

- `API_URL`, `BASE_URL`: URL backend/frontend.
- `WEB_PORT`: cổng Next.js dev server khi chạy E2E (mặc định 5173).
- `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`: mặc định `admin@smartcampus.test` / `Admin@123`.
- `TEST_TEACHER_EMAIL`, `TEST_TEACHER_PASSWORD`: mặc định `teacher@smartcampus.test` / `Teacher@123`.
- `TEST_STUDENT_EMAIL`, `TEST_STUDENT_PASSWORD`: mặc định `student@smartcampus.test` / `Student@123`.
- `TEST_STUDENT2_EMAIL`, `TEST_STUDENT2_PASSWORD`: tài khoản sinh viên thứ hai bật race test hai người.
- QR valid/invalid/expired/wrong-class, tạo challenge/check-in, finalize attendance và hai quy tắc khóa ghế sau khi kết thúc đều lấy fixture từ script provisioning; các ID/code sinh ra được ghi vào `.env`.
- Các test tạo phòng/booking/resource ghi dữ liệu qua API và cần database kiểm thử riêng. Không chạy import CSV hợp lệ hoặc gửi email thật trong bộ contract mặc định; verify email/reset token cần mailbox test có khả năng đọc token.

## Cấu trúc

- `api/`: API contract và workflow tests (auth, phòng/lịch/đặt phòng, duyệt lớp, ghế, QR/điểm danh, CSV/recovery, resources, absences, incidents, notifications).
- `e2e/`: browser tests cho login, lịch, booking phòng, ghế, QR, incident, notification, duyệt booking và resource CRUD/status.
- `setup/`: kiểm tra prerequisite chỉ đọc trước API suite.
- `helpers/`, `fixtures/`: API/JWT và dữ liệu dùng chung.

Các flow ghi dữ liệu (reservation, incident, resource) nên chạy trên database kiểm thử riêng hoặc dữ liệu đã dành cho test; các endpoint hiện có không hỗ trợ xóa lịch sử incident.

CI API job đọc kết nối từ secrets CI_DB_URL, CI_DB_USER, CI_DB_PASSWORD, CI_JWT_SECRET và không tạo schema/chạy migrations. Fixture SQL chỉ thêm dữ liệu trên test DB; principal CI cần quyền cho fixture setup. JaCoCo HTML/XML report được tạo tại `backend/target/site/jacoco` bằng `mvn verify`.
