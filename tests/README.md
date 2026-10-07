# Tests (Playwright)

Thư mục chứa API test và E2E test của dự án Smart Campus.

## Yêu cầu

- Node.js 20 trở lên (kiểm tra bằng `node -v`)

## Cài đặt

```bash
cd tests
npm ci
npx playwright install chromium
```

## Cấu hình

Copy `.env.example` thành `.env`, rồi chỉnh nếu cần:

- `BASE_URL`: địa chỉ frontend (mặc định http://localhost:5173)
- `API_URL`: địa chỉ backend (mặc định http://localhost:8080)

## Chạy test

```bash
npm test             # chạy tất cả
npm run test:api     # chỉ API test
npm run test:e2e     # chỉ E2E test
npm run report       # mở báo cáo HTML
```

## Cấu trúc

- `api/<module>/`: API test theo module (auth, rooms, reservations, seats, attendance)
- `e2e/<flow>/`: E2E test theo luồng (login, booking, seat-booking, qr-checkin, notification)
- `fixtures/`: dữ liệu test dùng chung
- `helpers/`: hàm hỗ trợ (login, API client...)

## Quy ước

- File test đặt tên `*.spec.ts`
- Tên test mô tả hành vi, ví dụ: `đặt phòng trùng giờ bị từ chối`
