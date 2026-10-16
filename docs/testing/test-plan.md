# Test Plan – Smart Campus Facility & Study Room Reservation

Người phụ trách: M4 – Nguyễn Văn Tâm (Testing)
Cập nhật: 16/10/2026 (Tuần 2)

## 1. Phạm vi
| Tuần | Phạm vi kiểm thử |
|------|------------------|
| 1 | Dựng nền: Playwright config, cấu trúc thư mục test, CI chạy compile/test cơ bản |
| 2 | Login (UI + API), Room API (list/detail), Schedule, Availability |
| 3+ | Reservation (xung đột đặt phòng 201/409), Seat, QR check-in, Notification, Incident |

## 2. Loại kiểm thử
- **Unit test**: Backend dùng JUnit (`mvn test`). Frontend chưa có framework (xem mục 6).
- **API test** (`tests/api`): Playwright `request`, gọi backend thật tại `API_URL`.
- **E2E test** (`tests/e2e`): Playwright + Chromium, chạy trên frontend (`BASE_URL`).

## 3. Môi trường
| Thành phần | Địa chỉ mặc định |
|-----------|------------------|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Spring Boot) | http://localhost:8080 |
| Test chạy bằng | Node 20+, Playwright ^1.63 |

## 4. Quy ước
- File `*.spec.ts`; tên test mô tả hành vi.
- Không hard-code id phòng: lấy từ `GET /rooms` qua helper `firstRoomId`.
- Test cho endpoint **chưa được implement** đặt trong `pending(...)` (skip mặc định, bật bằng `RUN_PENDING=true`).

## 5. Tiêu chí hoàn thành tuần 2
- Có test script cho Auth, Room, Schedule, Availability.
- CI chạy: frontend (build), backend (compile + test), api-tests, e2e-tests.
- Các test @pending chuyển sang chạy thật khi M2 hoàn thành endpoint.

## 6. Rủi ro / việc phụ thuộc
| # | Vấn đề | Phụ thuộc |
|---|--------|-----------|
| 1 | Backend chưa có `POST /auth/login`; frontend đang kiểm tra cứng admin/admin123 | M2, M3 |
| 2 | Chưa có `GET /rooms/{id}/schedule` và `/availability`; `openapi.yaml` đang rỗng | M2 |
| 3 | `database/seeds/V1__dev_seed.sql` rỗng → chưa có user/room mẫu cho test | M3 |
| 4 | Frontend chưa có script `lint` và framework unit test (Vitest) | M1 |
| 5 | RoomService đang trả dữ liệu cứng, chưa đọc DB | M2 |
