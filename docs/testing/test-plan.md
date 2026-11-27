# Kế hoạch kiểm thử — Smart Campus Room Reservation

| Trường | Nội dung |
|---|---|
| Phiên bản | 1.0 |
| Ngày cập nhật | 27/11/2026 |
| Phạm vi | Backend JUnit, Playwright API, Playwright giao diện, CI |
| Ca kiểm thử | [test-cases.md](test-cases.md) |
| Hướng dẫn chạy | [tests/README.md](../../tests/README.md) |

## 1. Mục tiêu

Xác minh đăng nhập, phòng/lịch/khả dụng, đặt phòng, ghế, QR/điểm danh, báo vắng, tài nguyên, sự cố và thông báo; kiểm tra nhập liệu sai, phân quyền, trùng thời gian và hai yêu cầu đồng thời. Đo line coverage backend bằng JaCoCo và giữ mức tối thiểu 60% qua `mvn verify`.

## 2. Phạm vi và phương pháp

| Cấp kiểm thử | Nội dung | Công cụ | Phụ thuộc |
|---|---|---|---|
| Unit/service/controller | Quy tắc nghiệp vụ, nhánh lỗi, phân quyền | JUnit 5, Mockito, JaCoCo | Spring context test dùng H2 trong bộ nhớ |
| API integration | Hợp đồng endpoint và workflow trên backend thật | Playwright `api` | Backend, PostgreSQL test, tài khoản, fixture |
| Browser UI | Login, lịch và workflow ba vai trò | Playwright `e2e`, Chromium | Frontend; request API được mock trong browser |
| CI | Lint/build frontend, Maven verify, API và browser suite | GitHub Actions | PostgreSQL service và fixture tạm trong runner |

Browser UI workflow chính dùng mock API. Project `e2e-live` kiểm tra đăng nhập, đặt/hủy phòng, teacher báo sự cố–admin xử lý và admin CRUD tài nguyên qua frontend–backend–DB thật. Browser đã quét mã QR từ video stream mô phỏng; camera vật lý và gửi/nhận email qua SMTP/mailbox thật chưa có ca tích hợp hoàn chỉnh.

## 3. Môi trường và dữ liệu

- Backend dùng `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`; Playwright dùng `API_URL`, `BASE_URL` hoặc `WEB_PORT`.
- Database test cần schema đã migrate; tài khoản admin, teacher, student, student2; phòng hoạt động loại `LAB`, `THEORY`, `SELF_STUDY` và ghế.
- Chạy `tests/scripts/provision-attendance-fixtures.ps1` trên Windows hoặc bản `.sh` trong CI ngay trước API suite. Script tạo dữ liệu QR/session kết thúc, ghi ID/code fixture vào môi trường; không sửa schema. Mã QR hợp lệ có thời hạn ngắn.
- Fixture session lịch sử dùng `session_replication_role` trong transaction; tài khoản DB chạy fixture cần quyền này. Chỉ chạy trên database kiểm thử.
- CI tự tạo PostgreSQL tạm, chạy tuần tự các migration, dữ liệu demo và `tests/fixtures/ci-base.sql`; không cần secrets của DB cục bộ. Mật khẩu trong workflow chỉ dùng cho database tạm của run đó.

## 4. Điều kiện bắt đầu và tiêu chí hoàn thành

**Điều kiện bắt đầu:** đã cài dependency và Chromium; backend/frontend khả dụng ở URL cấu hình; database/tài khoản test hợp lệ; fixture QR vừa được tạo trước API suite.

**Tiêu chí hoàn thành:** Maven verify pass với line coverage ≥60%; API và E2E không có fail/skip trong môi trường đã chuẩn bị; báo cáo Surefire, JaCoCo, Playwright được lưu; CI run trên nhánh/PR pass. Kết quả tại máy không được ghi là CI pass khi chưa có run CI thực tế.

## 5. Lộ trình và truy vết

| Tuần | Phạm vi | Nhóm ca kiểm thử |
|---|---|---|
| 1 | Setup JUnit, Playwright, cấu trúc test, CI lint/compile/test | SETUP, UNIT |
| 2 | Login, Room API, Schedule, Availability | AUTH, ROOM, SCHED, AVAIL |
| 3 | Booking success, overlap, boundary, invalid time, cancel | BOOK |
| 4 | Hai sinh viên đặt cùng phòng/ghế; một request thành công | RACE |
| 5 | QR valid/invalid/expired/wrong class, Resource CRUD/status | QR, RES |
| 6 | Incident, Notification, báo vắng và workflow | INCIDENT, NOTIF, ABSENCE |
| 7 | Regression, coverage ≥60%, browser workflow | UNIT, UI |
| 8 | Full CI/E2E và evidence Git/PR/Test | CI, EVIDENCE |

Chi tiết thao tác và kết quả mong đợi theo mã case ở [test-cases.md](test-cases.md).

## 6. Kết quả tại workspace

| Hạng mục | Kết quả ngày 27/11/2026 | Bằng chứng |
|---|---|---|
| Backend JUnit | 93 pass, 0 fail, 0 skip; Maven verify pass với repackaging bỏ qua do JAR local đang được dùng | `backend/target/surefire-reports/` |
| Backend coverage | 831/1.337 dòng = 62,15%; gate 60% pass | `backend/target/site/jacoco/index.html`, `jacoco.xml` |
| API Playwright | 53 pass, 0 fail, 0 skip trên PostgreSQL tạm sau migrations 001–028 và fixture | `tests/playwright-report/` khi chạy API |
| Browser Playwright mock API | 23 pass, 0 fail, 0 skip; gồm camera QR mô phỏng | `tests/playwright-report/` khi chạy E2E |
| Browser Playwright backend thật | 4 pass, 0 fail, 0 skip; login/booking, incident, resource | `tests/playwright-report/` khi chạy `e2e-live` |
| Frontend lint/typecheck/build | Pass; production build chạy trên bản sao tạm để tránh xung đột với dev server cổng 3000 | `npm run lint`, `tsc --noEmit`, `next build --webpack` tại máy |
| GitHub Actions | Run #99: frontend và E2E mock pass; backend thiếu datasource, API thiếu CI secrets. Bản sửa H2 và PostgreSQL service chưa được push/chạy lại | [Run #99](https://github.com/nghoangming/502045-smart-campus-room-reservation/actions/runs/46028751784) |

Playwright HTML report có thể bị ghi đè bởi lần chạy tiếp theo; lưu artifact riêng cho API/E2E khi cần nộp evidence.

## 7. Giới hạn và việc còn lại

| Nội dung | Tác động | Việc cần làm |
|---|---|---|
| Chưa xác nhận CI run | Chưa thể kết luận tuần 8 hoàn thành trên GitHub | Chạy workflow trên PR, lưu run URL, SHA và artifact |
| Browser thật chưa bao phủ ghế và QR | API integration và browser mock đã pass, nhưng ghế/QR chưa có browser test nối backend thật | Mở rộng `e2e-live` với fixture session/ghế/mã QR tươi |
| Chưa có mailbox test | CSV hợp lệ đã có JUnit; token activation/reset đã được bắt từ email giả và dùng thành công trong JUnit, nhưng SMTP/mailbox thật chưa kiểm tra | Dùng mail catcher hoặc mailbox test trong môi trường tích hợp |
| Chưa kiểm thử camera vật lý | Ca browser quyền bị chặn và quét QR từ video stream mô phỏng đã pass; thiết bị thật chưa kiểm tra | Chạy manual/device test |
| Coverage vượt ngưỡng 2,15 điểm | Code mới có thể làm gate fail | Thêm JUnit cho nhánh mới khi triển khai |

## 8. Lệnh chạy

```powershell
cd backend
.\mvnw.cmd verify
cd ..\tests
.\scripts\provision-attendance-fixtures.ps1
npx playwright test --project=api
npx playwright test --project=e2e
npx playwright test --project=e2e-live
```

Đặt biến môi trường từ `tests/.env` trước khi chạy backend. [tests/README.md](../../tests/README.md) mô tả cài đặt, cổng và biến môi trường chi tiết.
