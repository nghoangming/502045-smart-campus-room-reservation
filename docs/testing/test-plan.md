# Test Plan – Smart Campus Facility & Study Room Reservation

**Người phụ trách:** M4 – Nguyễn Văn Tâm (Testing)
**Cập nhật:** 21/10/2026

## Mục tiêu

Theo dõi phạm vi kiểm thử của M4 theo phân công từng tuần, chỉ ra phần đã có trong repo và phần còn phụ thuộc các thành viên khác. Test cho API chưa triển khai được giữ ở trạng thái `@pending` để CI hiện tại không lỗi vì thiếu endpoint.

## Kế hoạch theo tuần

| Tuần | Nhiệm vụ M4 | Phạm vi kiểm thử | Trạng thái hiện tại / tiêu chí hoàn thành |
|------|-------------|-----------------|-------------------------------------------|
| 1 | Setup unit test + Playwright; cấu trúc test; cấu hình CI compile/test cơ bản | Backend JUnit, Playwright API/E2E config, thư mục/fixtures/helpers, CI | **Đạt phần nền tảng trong repo.** Playwright tách API/E2E; CI có frontend lint/build, backend compile/test, API/E2E. Lint/unit test frontend chỉ chạy khi framework/scripts được M1 bổ sung. |
| 2 | Test Login, Room API, Schedule, Availability; cập nhật CI | Login UI/API; Room list/detail; Schedule UI/API; Availability API | **Đạt một phần.** Login UI, Room API, Schedule UI/API, Availability API test và CI đã có. API Login đang `@pending` do chưa thấy Auth endpoint; Schedule/Availability test đã được chỉnh theo controller hiện có. |
| 3 | Test booking success, overlap, boundary time, invalid time, cancel | Reservation API: tạo thành công, xung đột giờ, biên liền kề, dữ liệu không hợp lệ, hủy | Bộ test ở `tests/api/reservations/reservations.spec.ts` đã được chỉnh theo `/study-room-reservations` và `/cancel` PATCH. Backend có các endpoint này trên `origin/develop`; suite giữ `@pending` trên feature branch cho đến khi backend đó được merge và test DB sẵn sàng. |
| 4 | Test hai người đồng thời đặt cùng phòng và cùng ghế; chỉ một request thành công | Kiểm thử concurrency trên API Reservation/Seat | Bộ test ở `tests/api/seats/seat-concurrency.spec.ts` đã được chỉnh theo `/class-sessions`, `/seat-reservations` và hai route reservation thực tế. Hiện chỉ chứng minh được hai request tranh chấp có một request thắng; backend đang dùng user ID placeholder `1`, nên chưa mô phỏng được hai user khác nhau. |
| 5 | Test QR valid/invalid/expired/wrong class; Resource CRUD và status | Attendance QR check-in và Resource API | Đã thêm `tests/api/attendance/qr-checkin.spec.ts` và `tests/api/resources/resources.spec.ts` theo hợp đồng trong OpenAPI. Cả hai suite đang `@pending` vì nhánh backend hiện chưa có Attendance/Resource controller. |

## Loại kiểm thử và môi trường

| Loại | Công cụ / phạm vi | Môi trường mặc định |
|------|------------------|--------------------|
| Unit | Backend JUnit (`mvn test`); frontend hiện chưa có framework unit test | Backend build environment |
| API | Playwright `request` gọi backend | `API_URL=http://localhost:8080` |
| E2E | Playwright + Chromium trên frontend | `BASE_URL=http://localhost:5173` |

Yêu cầu test: Node.js 20+ và Playwright `^1.63`. CI chạy các job frontend, backend, API tests và E2E tests theo workflow hiện tại.

## Quy ước thực hiện

- File test dùng hậu tố `*.spec.ts`; tên test mô tả hành vi và kết quả mong đợi.
- Lấy room ID từ API/helper thay vì hard-code ID.
- Dùng ngày tương lai cho booking test để giảm phụ thuộc dữ liệu lịch sử.
- API chưa sẵn sàng dùng helper `pending(...)`; chạy có chủ đích bằng `RUN_PENDING=true` sau khi API và dữ liệu test đã sẵn sàng.
- Test tranh chấp phải gửi đồng thời cùng một tài nguyên/khung giờ trên database test dùng chung; không chạy dựa trên stub hoặc dữ liệu được cô lập riêng cho mỗi request.
- QR check-in cần seed class session/QR test hợp lệ, QR hết hạn và class session khác; truyền qua các biến môi trường `TEST_QR_*`.
- Resource CRUD cần token admin trong `TEST_ADMIN_TOKEN`; test xóa resource do nó tạo trong bước cleanup.

## Rủi ro và phụ thuộc

| Vấn đề | Phụ thuộc | Hướng xử lý |
|--------|-----------|-------------|
| Chưa có Auth API test/contract đăng nhập rõ ràng | M2, M3 | Chốt route, payload, auth response và seed user trước khi viết/bật test API. |
| Auth/Schedule/Availability API test đang `@pending`; cần xác nhận một số route/shape có khớp backend hiện tại hay không | M2 | Đối chiếu test với controller/OpenAPI trước khi bật; đặc biệt availability hiện trả danh sách phòng từ `/rooms/availability`. |
| Feature branch chưa tích hợp các controller Reservation/Seat mới nhất từ `origin/develop` | M2, M3 | Merge backend tuần 3–4 vào feature branch; tests đã theo route/DTO hiện tại, sau đó chạy trên DB test và bỏ `pending` nếu pass. |
| Backend chưa gắn identity từ authentication; Reservation/Seat services đang dùng user ID placeholder | M2 | Khi auth được tích hợp, cấp hai user/token khác nhau và mở rộng concurrency test để xác nhận riêng kịch bản hai người dùng. |
| Attendance/Resource mới được mô tả trong OpenAPI, chưa có controller backend trong nhánh hiện tại | M2, M3 | Triển khai endpoint và seed QR/session/resource trước khi bỏ `@pending`. |
| Dữ liệu concurrency có thể va chạm giữa CI runs | M2, M3, CI | Dùng ngày/giờ test định trước hoặc cơ chế tạo và dọn dữ liệu test riêng. |
| Frontend chưa có unit test framework/script | M1 | Quyết định framework và thêm script khi phạm vi yêu cầu frontend unit test. |
