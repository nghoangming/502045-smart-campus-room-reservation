# Test Plan – Smart Campus Facility & Study Room Reservation

**Người phụ trách:** M4 – Nguyễn Văn Tâm (Testing)
**Cập nhật:** 21/10/2026

## Mục tiêu

Theo dõi phạm vi kiểm thử của M4 theo phân công từng tuần, chỉ ra phần đã có trong repo và phần còn phụ thuộc các thành viên khác. Test cho API chưa triển khai được giữ ở trạng thái `@pending` để CI hiện tại không lỗi vì thiếu endpoint.

## Kế hoạch theo tuần

| Tuần | Nhiệm vụ M4 | Phạm vi kiểm thử | Trạng thái hiện tại / tiêu chí hoàn thành |
|------|-------------|-----------------|-------------------------------------------|
| 1 | Setup unit test + Playwright; cấu trúc test; cấu hình CI compile/test cơ bản | Backend JUnit, Playwright API/E2E config, thư mục/fixtures/helpers, CI | **Đạt phần nền tảng trong repo.** Playwright tách API/E2E; CI có frontend lint/build, backend compile/test, API/E2E. Lint/unit test frontend chỉ chạy khi framework/scripts được M1 bổ sung. |
| 2 | Test Login, Room API, Schedule, Availability; cập nhật CI | Login UI/API; Room list/detail; Schedule UI/API; Availability API | **Đạt một phần.** Login UI, Room API list/detail, Schedule UI và CI test đã có. Còn thiếu Login API, Schedule API và Availability API test. |
| 3 | Test booking success, overlap, boundary time, invalid time, cancel | Reservation API: tạo thành công, xung đột giờ, biên liền kề, dữ liệu không hợp lệ, hủy | Bộ test được tạo trong `tests/api/reservations/reservations.spec.ts` và đang `@pending`. Hoàn thành khi API trả 201 cho đặt thành công, 409 cho overlap, 400 cho dữ liệu/giờ sai, hỗ trợ hủy và cập nhật trạng thái. |
| 4 | Test hai người đồng thời đặt cùng phòng và cùng ghế; chỉ một request thành công | Kiểm thử concurrency trên API Reservation/Seat | Bộ test được tạo trong `tests/api/seats/seat-concurrency.spec.ts` và đang `@pending`. Hoàn thành khi trong hai request cạnh tranh cùng tài nguyên/khung giờ chỉ một request thành công, request còn lại bị từ chối. |

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

## Rủi ro và phụ thuộc

| Vấn đề | Phụ thuộc | Hướng xử lý |
|--------|-----------|-------------|
| Chưa có Auth API test/contract đăng nhập rõ ràng | M2, M3 | Chốt route, payload, auth response và seed user trước khi viết/bật test API. |
| Schedule/Availability API test còn thiếu dù endpoint có trong backend | M2 | Viết test theo response thực tế; kiểm tra ngày/giờ sai, phòng không tồn tại, danh sách rỗng và khung giờ khả dụng. |
| Reservation API, route cancel và shape response chưa có trong repo | M2, M3 | Thống nhất endpoint, status code, ID và trạng thái sau hủy; sau đó bỏ `pending`. |
| Seat API và dữ liệu ghế/lớp chưa có trong repo | M2, M3 | Chuẩn bị fixture/seed ổn định cho cùng ghế và class session. |
| Dữ liệu concurrency có thể va chạm giữa CI runs | M2, M3, CI | Dùng ngày/giờ test định trước hoặc cơ chế tạo và dọn dữ liệu test riêng. |
| Frontend chưa có unit test framework/script | M1 | Quyết định framework và thêm script khi phạm vi yêu cầu frontend unit test. |
