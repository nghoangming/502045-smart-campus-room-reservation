# Test plan và evidence (27/11/2026)

Đối chiếu Playwright specs với API controller/DTO hiện tại. API suite chỉ dùng database đã cấu hình; setup prerequisite chỉ GET dữ liệu, không chạy migrations, seed SQL hoặc thay đổi schema.

| Tuần | Phạm vi | Tình trạng test hiện tại |
|---|---|---|
| 1 | Playwright, JUnit, CI lint/compile/test | API/E2E project tách riêng; CI chạy lint/build, Maven verify và upload Surefire/JaCoCo artifact. |
| 2 | Login, Rooms, Schedule, Availability | Specs đã theo response Login `accessToken/roles`; rooms/schedule dùng Bearer token; Availability public và dùng `startTime/endTime`. API setup chỉ kiểm tra admin và loại phòng. |
| 3 | Booking success, overlap, adjacent boundary, invalid time, cancel | Spec dùng `/study-room-reservations`, ISO offset datetimes và PATCH `/{id}/cancel`. |
| 4 | Hai người cùng đặt phòng/ghế | Hai race specs gửi request song song với student và student2; cả hai chạy và xác nhận đúng một request thành công. |
| 5 | QR valid/invalid/expired/wrong class; Resource CRUD/status | Fixture script tạo challenge/session tươi trước API suite; QR và Resource CRUD/status đều chạy. |
| 6 | Incident/Notification và flow chính | Incident spec báo cáo, admin resolve, kiểm tra thông báo phát sinh và đánh dấu đã đọc. Notification spec kiểm tra list/read-all/auth. |
| 7 | Regression, coverage, E2E, evidence | E2E gồm login, schedule và các flow chính; JaCoCo đo line coverage toàn backend. Mức hiện đo được 39.11%, dưới mục tiêu cũ 60%. |
| 8 | Full CI/E2E và evidence | CI chạy Maven verify, API suite với fixture, E2E suite và lưu báo cáo/artifact. |

## Các test workflow vừa bổ sung

- `api/class-sessions/booking-approval.spec.ts`: giáo viên tạo booking tương lai kèm buổi học, admin duyệt; kiểm tra thêm từ chối booking khác. API hiện tạo buổi học cùng lúc tạo yêu cầu, trước lúc admin duyệt.
- `api/seats/seat-lifecycle.spec.ts`: tự tạo session test qua API, xem sơ đồ, giữ ghế, xác nhận danh sách của mình và hủy ghế.
- `api/absences/absence-workflows.spec.ts`: student gửi yêu cầu và teacher review; teacher báo vắng và admin quyết định. Dùng hai session riêng cấu hình qua `TEST_STUDENT_ABSENCE_SESSION_ID` và `TEST_TEACHER_ABSENCE_SESSION_ID`.
- `api/attendance/qr-workflow.spec.ts`: cấp mã qua API, check-in và xem danh sách điểm danh; fixture script chuẩn bị session/student2 trong cửa sổ 5–20 phút. Finalize chạy với một session ended riêng.
- `api/accounts/intake-and-recovery.spec.ts`: xác minh CSV sai header, activation token sai, forgot-password với email không tồn tại. Import hợp lệ và xác minh/reset thực sự cần mailbox test đọc token nên chưa tự chạy.
- `api/rooms/room-crud.spec.ts`: tạo/cập nhật status/đọc/xóa phòng test mới; không dùng fixture phòng thật.
- `api/reservations/study-approval.spec.ts`: duyệt một booking study đã chuẩn bị qua `TEST_STUDY_RESERVATION_ID`; dữ liệu booking pending và capacity cần chuẩn bị sau.

## Hợp đồng test đã dùng

- Login: `POST /api/v1/auth/login` trả `accessToken`, `roles`, `email`, `id`.
- Schedule: `GET /api/v1/rooms/{id}/schedule?date=YYYY-MM-DD`, cần Bearer token; phần tử dùng `startTime/endTime`.
- Availability: `GET /api/v1/rooms/availability?date=...&startTime=...&endTime=...`, trả array phòng và không yêu cầu token.
- Reservation: `/api/v1/study-room-reservations`, `startTime/endTime` là ISO offset datetime; cancel bằng PATCH.
- Seat: `/api/v1/class-sessions/{id}/seats`, POST `/api/v1/seat-reservations` với `classSessionId/seatId`.

## Môi trường và CI

CI API job yêu cầu secrets `CI_DB_URL`, `CI_DB_USER`, `CI_DB_PASSWORD`, `CI_JWT_SECRET` và tài khoản admin/teacher/two students. Database test phải migrate sẵn và có phòng LAB, THEORY cùng STUDY. CI provision step tạo QR/ended-session fixture ngắn hạn; principal DB kiểm thử cần quyền tạo bản ghi fixture và `session_replication_role` trong transaction.

Evidence cần lưu cùng commit: Playwright HTML report, Surefire XML, JaCoCo HTML/XML, CI run URL, commit SHA và PR URL. Coverage tính trên toàn bộ backend Java source bằng JaCoCo line counter.

## Kết quả chạy tại workspace

- 27/11/2026: API suite gồm **50 API tests + 1 API prerequisite check**. Fixture setup tạo QR valid/expired/wrong-class, workflow trong cửa sổ check-in và ended session/seat; không còn skip khi chạy ngay sau provisioning.
- `mvnw test`: **42 passed, 0 failed** khi cấp `DB_URL`, `DB_USER`, `DB_PASSWORD` từ `tests/.env`; `spring.jpa.hibernate.ddl-auto=validate` chỉ kiểm tra schema.
- Frontend `npm ci` khôi phục dependency `jsqr` đã có trong lockfile nhưng thiếu trong `node_modules`; Playwright Chromium cần được cài tương ứng phiên bản trước khi chạy E2E.
- API regression sau provisioning: **51 passed, 0 skipped, 0 failed**. Cả hai bài concurrency (hai sinh viên cùng khung giờ và cùng ghế) chạy với student2 và pass.
- E2E trên frontend cổng 3000: **20/20 passed** lần xác minh gần nhất. Browser flow gồm student booking/cancel, seat reserve/cancel, QR check-in, teacher booking/QR/incident, admin approval, resource CRUD/status và notification read-all. Các browser flow mock API; API integration thật được kiểm tra riêng.
- Frontend `npm run lint`: pass; `tsc --noEmit`: pass.
- JaCoCo toàn backend: **508/1,299 lines = 39.11%**. Report HTML/XML nằm trong `backend/target/site/jacoco`; mục tiêu 60% hiện chưa đạt.
