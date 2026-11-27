# Danh sách ca kiểm thử — Smart Campus Room Reservation

| Trường | Nội dung |
|---|---|
| Phiên bản | 1.0 |
| Ngày cập nhật | 27/11/2026 |
| Kế hoạch liên quan | [test-plan.md](test-plan.md) |
| Ký hiệu | API: backend thật; UI: browser dùng API mock; UNIT: JUnit; PASS: đã chạy đạt tại máy; PENDING: chưa xác minh trọn luồng |

Mã case dùng để truy vết; file spec chứa bước thực hiện và assertion chi tiết. Một dòng có thể gộp các biến thể cùng workflow. Trạng thái ghi lần chạy tại workspace ngày 27/11/2026, chưa phải kết quả GitHub Actions.

## 1. Điều kiện tiên quyết và unit

| ID | Điều kiện / thao tác | Kết quả mong đợi | Tự động hóa | Kết quả |
|---|---|---|---|---|
| SETUP-01 | Đăng nhập admin, đọc danh sách phòng trước API suite | Có tài khoản và loại phòng bắt buộc | `tests/setup/api.setup.spec.ts` | PASS |
| UNIT-01 | Chạy `mvn verify` với DB test đã migrate | 90 JUnit pass; JaCoCo line ≥60% | `backend/src/test/java`, `backend/pom.xml` | PASS — 61,74% |
| UNIT-02 | Import CSV Google Form hợp lệ, bắt email activation và dùng token; bắt email reset và đổi mật khẩu | Dữ liệu CSV được nhận; token dùng một lần; password đổi và tăng auth version | `StudentIntakeCsvServiceTest.java`, `UserInvitationServiceTest.java`, `AccountRecoveryServiceTest.java` | PASS — mail sender giả |

## 2. API contract và workflow

Điều kiện chung: `API_URL` trỏ đến backend đang chạy; tài khoản đủ vai trò; ca ghi dữ liệu chạy trên database test. QR cần provision fixture ngay trước suite.

| ID | Thao tác chính | Kết quả mong đợi | File spec trong `tests/api/` | Kết quả |
|---|---|---|---|---|
| AUTH-01 | Đăng nhập hợp lệ | Trả JWT, roles, không lộ password | `auth/login.spec.ts` | PASS |
| AUTH-02 | Đăng nhập sai hoặc thiếu trường | Từ chối đồng nhất; thiếu dữ liệu trả 400 | `auth/login.spec.ts` | PASS |
| AUTH-03 | Đăng nhập sinh viên | Có role STUDENT | `auth/login.spec.ts` | PASS |
| ROOM-01 | Liệt kê, đọc chi tiết phòng | Mảng không rỗng, ID duy nhất, dữ liệu đúng | `rooms/rooms.spec.ts` | PASS |
| ROOM-02 | Đọc phòng không tồn tại | 404 kèm thông báo | `rooms/rooms.spec.ts` | PASS |
| ROOM-03 | Admin tạo, cập nhật, đọc, xóa phòng test | CRUD và trạng thái đúng | `rooms/room-crud.spec.ts` | PASS |
| SCHED-01 | Đọc lịch ngày có/không có buổi học | Trả mảng; start trước end | `rooms/schedule.spec.ts` | PASS |
| SCHED-02 | Ngày sai/thiếu, phòng không tồn tại | 400/404 phù hợp | `rooms/schedule.spec.ts` | PASS |
| AVAIL-01 | Truy vấn khung giờ hợp lệ | Trả mảng phòng khả dụng | `rooms/availability.spec.ts` | PASS |
| AVAIL-02 | Thời gian đảo/ngang nhau, thiếu/sai tham số | Từ chối yêu cầu | `rooms/availability.spec.ts` | PASS |
| BOOK-01 | Sinh viên tạo rồi hủy booking tự học | Tạo được booking và hủy thành công | `reservations/reservations.spec.ts` | PASS |
| BOOK-02 | Đặt phòng trùng giờ và khung giờ liền kề | Trùng bị từ chối; liền kề được chấp nhận | `reservations/reservations.spec.ts` | PASS |
| BOOK-03 | Gửi thời gian hoặc payload sai | Trả lỗi validation | `reservations/reservations.spec.ts` | PASS |
| BOOK-04 | Admin duyệt booking tự học mới | Booking chuyển trạng thái đúng | `reservations/study-approval.spec.ts` | PASS |
| BOOK-05 | Teacher tạo booking kèm session, admin duyệt booking; tạo booking khác để từ chối | Session được tạo cùng yêu cầu; booking đổi sang CONFIRMED/REJECTED đúng | `class-sessions/booking-approval.spec.ts` | PASS |
| RACE-01 | Hai sinh viên cùng đặt phòng/cùng giờ | Chính xác một request thành công | `reservations/reservations.spec.ts` | PASS |
| RACE-02 | Hai sinh viên cùng giữ một ghế/session | Chính xác một request thành công | `seats/seat-concurrency.spec.ts` | PASS |
| SEAT-01 | Xem sơ đồ, giữ ghế, xem ghế của mình, hủy | Vòng đời ghế đúng | `seats/seat-lifecycle.spec.ts` | PASS |
| SEAT-02 | Đặt hoặc hủy ghế sau khi session kết thúc | Bị từ chối | `seats/session-end-lock.spec.ts` | PASS |
| QR-01 | Điểm danh mã hợp lệ; teacher cấp mã và xem danh sách | Check-in thành công, danh sách cập nhật | `attendance/qr-attendance.spec.ts`, `qr-workflow.spec.ts` | PASS |
| QR-02 | Mã sai, hết hạn, sai lớp, thiếu mã/session, chưa đăng nhập | Bị từ chối theo contract | `attendance/qr-attendance.spec.ts` | PASS |
| QR-03 | Teacher finalize session sau cửa sổ QR | Điểm danh chưa check-in được chốt | `attendance/finalize-attendance.spec.ts` | PASS |
| ABSENCE-01 | Student xin vắng, teacher duyệt | Trạng thái yêu cầu đổi đúng | `absences/absence-workflows.spec.ts` | PASS |
| ABSENCE-02 | Teacher báo vắng, admin quyết định | Trạng thái yêu cầu đổi đúng | `absences/absence-workflows.spec.ts` | PASS |
| RES-01 | Admin tạo, đổi trạng thái, xóa tài nguyên | CRUD/status đúng | `resources/resources.spec.ts` | PASS |
| RES-02 | Trạng thái tài nguyên sai hoặc thiếu xác thực | Bị từ chối | `resources/resources.spec.ts` | PASS |
| INCIDENT-01 | Teacher báo sự cố, admin xử lý | Sự cố đổi trạng thái, notification phát sinh | `incidents/incidents.spec.ts` | PASS |
| INCIDENT-02 | Loại sự cố sai hoặc thiếu xác thực | Bị từ chối | `incidents/incidents.spec.ts` | PASS |
| NOTIF-01 | Liệt kê, đánh dấu tất cả đã đọc lặp lại | Kết quả idempotent | `notifications/notifications.spec.ts` | PASS |
| NOTIF-02 | Đọc notification khi chưa đăng nhập | Bị từ chối | `notifications/notifications.spec.ts` | PASS |
| ACCOUNT-01 | Import CSV thiếu cột bắt buộc | Bị từ chối | `accounts/intake-and-recovery.spec.ts` | PASS |
| ACCOUNT-02 | Token kích hoạt sai; quên mật khẩu cho email lạ | Token bị từ chối; recovery không tiết lộ tài khoản | `accounts/intake-and-recovery.spec.ts` | PASS |
| HEALTH-01 | Gọi health endpoint | HTTP 200 | `health/health.spec.ts` | PASS |

Các dòng nhóm nhiều assertion hoặc biến thể trong cùng spec; tổng Playwright API gần nhất là **51 passed, 0 skipped, 0 failed**, gồm SETUP-01.

## 3. Browser UI

Điều kiện chung: frontend và Chromium hoạt động; Playwright mock request `/api/v1/**`. Kết quả xác minh hành vi UI, chưa xác minh frontend với backend thật.

| ID | Thao tác chính | Kết quả mong đợi | File spec trong `tests/e2e/` | Kết quả |
|---|---|---|---|---|
| UI-01 | Mở login, kiểm tra form và validation | Hiện trường/role đúng; không submit dữ liệu thiếu | `login/login.spec.ts` | PASS |
| UI-02 | Đăng nhập sinh viên; thử mật khẩu sai | Vào workspace và lưu phiên; lỗi hiển thị khi sai | `login/login.spec.ts` | PASS |
| UI-03 | Hiện/ẩn mật khẩu, mở admin login, URL lạ | Kiểu input đổi; admin form riêng; URL lạ trả 404 | `login/login.spec.ts` | PASS |
| UI-04 | Mở lịch và chuyển tuần | Trạng thái ngày và ngày chọn cập nhật | `schedule/room-schedule.spec.ts` | PASS |
| UI-05 | Sinh viên đặt/hủy phòng, giữ/hủy ghế | Giao diện hiển thị trạng thái thành công | `workflows.spec.ts` | PASS |
| UI-06 | Sinh viên nhập mã QR để check-in | Hiển thị kết quả điểm danh | `workflows.spec.ts` | PASS |
| UI-07 | Giảng viên đặt phòng/tạo session, tạo QR | Hiển thị phản hồi thành công/mã QR | `workflows.spec.ts` | PASS |
| UI-08 | Giảng viên báo sự cố | Sự cố xuất hiện trong danh sách | `workflows.spec.ts` | PASS |
| UI-09 | Admin duyệt booking, CRUD/status tài nguyên | Giao diện cập nhật đúng | `workflows.spec.ts` | PASS |
| UI-10 | Admin đọc notification và xử lý sự cố | Trạng thái read/resolve cập nhật | `workflows.spec.ts` | PASS |
| UI-11 | Chạy browser sanity | Chromium/Playwright render được nội dung | `sanity.spec.ts` | PASS |
| UI-12 | Camera bị từ chối quyền | Hiện hướng dẫn cấp quyền và đóng dialog được | `workflows.spec.ts` | PASS |
| UI-13 | Phát ảnh QR qua video stream mô phỏng | Quét và tự điền đúng mã do giao diện teacher tạo | `workflows.spec.ts` | PASS |

Các dòng gộp thao tác cùng workflow; tổng browser suite mock API gần nhất là **22 passed, 0 failed**.

## 4. Browser với backend thật

| ID | Thao tác chính | Kết quả mong đợi | File spec | Kết quả |
|---|---|---|---|---|
| LIVE-01 | Sinh viên đăng nhập, mở phòng tự học và lịch | Dữ liệu tải từ backend thật, hiển thị đúng | `tests/e2e-live/student-smoke.spec.ts` | PASS |
| LIVE-02 | Sinh viên đặt rồi hủy phòng tự học | Booking tạo và hủy qua API thật | `tests/e2e-live/student-smoke.spec.ts` | PASS |
| LIVE-03 | Teacher báo sự cố, admin xử lý | Sự cố tạo và chuyển sang đã xử lý qua API thật | `tests/e2e-live/student-smoke.spec.ts` | PASS |
| LIVE-04 | Admin tạo, đổi trạng thái, xóa tài nguyên | CRUD và trạng thái đúng qua API thật | `tests/e2e-live/student-smoke.spec.ts` | PASS |

## 5. Ca chưa xác minh trọn luồng

| ID | Ca cần bổ sung | Điều kiện cần có | Trạng thái |
|---|---|---|---|
| GAP-01 | CSV hợp lệ → SMTP thật → nhận email kích hoạt | Mailbox test/mail catcher đọc token | PENDING |
| GAP-02 | SMTP thật → nhận email reset | Mailbox test/mail catcher đọc token | PENDING |
| GAP-03 | Browser kết nối backend thật qua ghế và QR | Fixture session/ghế/mã QR tươi và frontend/backend cùng môi trường | PENDING |
| GAP-04 | Camera vật lý quét QR trên thiết bị thật | Thiết bị có camera và quyền truy cập | PENDING |
| GAP-05 | Full CI, artifact và evidence Git/PR | CI secrets, DB test truy cập được từ runner, CI run thực tế | PENDING |

## 6. Quy tắc ghi evidence

Mỗi lần chạy lưu ngày giờ, nhánh, commit SHA, môi trường, lệnh chạy, số passed/failed/skipped và đường dẫn artifact. Chỉ đổi GAP sang PASS khi ca tương ứng được chạy và có evidence. Surefire/JaCoCo nằm trong `backend/target/`; Playwright HTML trong `tests/playwright-report/`; CI artifact chỉ có sau khi workflow chạy trên GitHub.
