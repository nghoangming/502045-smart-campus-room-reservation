# Test cases và trạng thái

Rà soát 27/11/2026. Không có case API bị bao bởi `@pending`; các test cần tài khoản/fixture đặc thù dùng `test.skip` với lý do cấu hình cụ thể.

| Tuần | Trường hợp | File/hiện trạng |
|---|---|---|
| 1 | Cấu trúc API/E2E, CI, backend JUnit | `playwright.config.ts`, `.github/workflows/ci.yml`, JUnit và JaCoCo report trong `mvn verify`. Chưa có frontend unit test hoặc coverage gate. |
| 2 | Login API, Room API, Schedule, Availability | API specs theo contract; API setup xác minh admin và có cả loại phòng classroom/study room chỉ bằng GET. |
| 3 | Booking thành công, overlap, liền kề, giờ sai, cancel | `api/reservations/reservations.spec.ts`, actual URL/payload/status. |
| 4 | Hai student đặt đồng thời cùng phòng/cùng ghế | Reservation và seat specs gửi request song song với hai tài khoản; đã chạy pass với student2 ngày 27/11/2026. |
| 5 | QR valid/invalid/expired/wrong class; Resource status/CRUD | Fixture script tự tạo dữ liệu QR/session tươi; valid/invalid/expired/wrong-class chạy pass. Resource API thực hiện CRUD và kiểm tra status sai. |
| 6 | Incident/Notification | Incident lifecycle xác nhận notification được tạo; notification list/read-all/auth có spec riêng; E2E UI bao phủ report/resolve incident và read-all notification. |
| 7 | Regression/E2E/coverage/evidence | E2E 20/20 pass; JaCoCo đo được 39.11% line coverage, dưới ngưỡng mục tiêu 60%. |
| 8 | Full CI | Workflow đã cấu hình Maven verify, API với fixture và E2E; cần CI run để lưu evidence trên Git/PR. |

Các file workflow bổ sung: `api/class-sessions/booking-approval.spec.ts`, `api/seats/seat-lifecycle.spec.ts`, `api/seats/session-end-lock.spec.ts`, `api/absences/absence-workflows.spec.ts`, `api/attendance/qr-workflow.spec.ts`, `api/accounts/intake-and-recovery.spec.ts`, `api/rooms/room-crud.spec.ts`, `api/reservations/study-approval.spec.ts`. QR realtime, ghế và các approval có dữ liệu nền cần env fixture; chúng được đánh dấu skip nếu fixture thiếu.

API test có ghi dữ liệu nghiệp vụ qua endpoint (reservation/incident/resource) và nên chạy trên DB dành cho kiểm thử. Fixture SQL chỉ thêm/cập nhật dữ liệu được gắn tên QA; không có migration/schema nào được thêm hoặc sửa. Fixture attendance dùng quyền DB cho `session_replication_role` trong transaction khi dựng ghế lịch sử cho session đã kết thúc.

## Kết quả chạy mới nhất

- E2E: **20 passed, 0 failed** ngày 27/11/2026; cần cài Chromium tương thích Playwright trước lần chạy trên môi trường mới.
- API regression ngày 27/11/2026: **51 passed, 0 skipped, 0 failed** (bao gồm prerequisite check), sau khi chạy fixture provisioning. Hai race test cùng phòng/cùng khung giờ và cùng ghế đều chạy với student2 và pass.
- Backend JUnit: **42 passed, 0 failed** khi cấp DB variables từ `tests/.env`; `ddl-auto=validate` không thay đổi schema. JaCoCo line coverage là **508/1,299 (39.11%)**, dưới mục tiêu 60%. Chạy Maven không có DB variables làm context test không thể kết nối.
- E2E trên cổng 3000: **20/20 passed** ngày 27/11/2026 sau khi thêm `127.0.0.1` vào `allowedDevOrigins` và restart Next.js. Trước khi sửa, Next.js chặn HMR cross-origin nên JavaScript phía client không hydrate.
