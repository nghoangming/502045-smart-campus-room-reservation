# Test Cases – M4 (Tuần 1–4)

**Phụ trách:** Nguyễn Văn Tâm
**Trạng thái:** ✅ đã có test chạy · ⏳ `@pending` chờ API hoặc dữ liệu test

## Tuần 1 – nền tảng test và CI

| ID | Hạng mục | Kết quả / tiêu chí | Trạng thái |
|----|----------|--------------------|------------|
| T1-SETUP-01 | Playwright config có project API và E2E | Có thể liệt kê và chạy riêng từng project | ✅ |
| T1-SETUP-02 | Cấu trúc API/E2E, helper và fixture | Test được nhóm theo feature; dùng helper chung | ✅ |
| T1-CI-01 | CI frontend | Chạy lint/build nếu script tương ứng được cấu hình | ✅ cấu hình |
| T1-CI-02 | CI backend | Chạy `mvn compile` và `mvn test` | ✅ cấu hình |
| T1-CI-03 | CI API/E2E | Khởi chạy backend/frontend và chạy Playwright | ✅ cấu hình |

## Tuần 2 – Login, Room, Schedule, Availability

### Login UI – `tests/e2e/login/login.spec.ts`

| ID | Mô tả | Kết quả mong đợi | Trạng thái |
|----|-------|------------------|------------|
| TC-LOGIN-01 | Mở `/login` | Hiện form Username, Password và nút Sign in | ✅ |
| TC-LOGIN-02 | Đăng nhập `admin/admin123` | Chuyển tới `/dashboard`, lưu `smartCampusLoggedIn=true` | ✅ |
| TC-LOGIN-03 | Sai mật khẩu | Hiện thông báo lỗi, vẫn ở `/login`, không lưu trạng thái đăng nhập | ✅ |
| TC-LOGIN-04 | Sai username | Hiện thông báo đăng nhập không hợp lệ | ✅ |
| TC-LOGIN-05 | Bỏ trống cả hai trường | Yêu cầu nhập đủ username/password | ✅ |
| TC-LOGIN-06 | Chỉ nhập username | Yêu cầu nhập đủ username/password | ✅ |
| TC-LOGIN-07 | Bấm Show/Hide | Chuyển kiểu hiển thị password/text | ✅ |
| TC-LOGIN-08 | Mở URL không tồn tại | Điều hướng về trang login | ✅ |

### Login API – dự kiến `tests/api/auth/login.spec.ts`

| ID | Mô tả | Kết quả mong đợi | Trạng thái |
|----|-------|------------------|------------|
| TC-AUTH-01 | Đăng nhập đúng tài khoản | 200, response có token | ⏳ API chưa có |
| TC-AUTH-02 | Kiểm tra dữ liệu response | Không lộ password/hash | ⏳ API chưa có |
| TC-AUTH-03 | Sai mật khẩu | 401 | ⏳ API chưa có |
| TC-AUTH-04 | Email không tồn tại | 401 với thông báo không tiết lộ tài khoản tồn tại | ⏳ API chưa có |
| TC-AUTH-05 | Thiếu password/body rỗng | 400 | ⏳ API chưa có |
| TC-AUTH-06 | Student đăng nhập | 200, role là STUDENT | ⏳ API/seed chưa có |

### Room API – `tests/api/rooms/rooms.spec.ts`

| ID | Mô tả | Kết quả mong đợi | Trạng thái |
|----|-------|------------------|------------|
| TC-ROOM-01 | `GET /rooms` | 200, JSON array không rỗng | ✅ |
| TC-ROOM-02 | Kiểm tra trường phòng | Mỗi phòng có ID và tên hợp lệ | ✅ |
| TC-ROOM-03 | Kiểm tra ID phòng | Không trùng nhau | ✅ |
| TC-ROOM-04 | `GET /rooms/{id}` hợp lệ | 200, ID response khớp ID yêu cầu | ✅ |
| TC-ROOM-05 | `GET /rooms/{id}` không tồn tại | 404, response có thông tin lỗi | ✅ |
| TC-HEALTH-01 | `GET /health` | Backend trả 200 | ✅ |

### Schedule API – dự kiến `tests/api/rooms/schedule.spec.ts`

| ID | Mô tả | Kết quả mong đợi | Trạng thái |
|----|-------|------------------|------------|
| TC-SCH-01 | Lấy lịch phòng theo ngày | 200, trả array | ⏳ Chưa có API test |
| TC-SCH-02 | Kiểm tra thời gian từng mục lịch | start trước end | ⏳ Chưa có API test |
| TC-SCH-03 | Ngày không có lịch | 200, array rỗng | ⏳ Chưa có API test |
| TC-SCH-04 | Ngày sai định dạng hoặc thiếu date | 400 | ⏳ Chưa có API test |
| TC-SCH-05 | Room ID không tồn tại | 404 | ⏳ Chưa có API test |

### Availability API – dự kiến `tests/api/rooms/availability.spec.ts`

| ID | Mô tả | Kết quả mong đợi | Trạng thái |
|----|-------|------------------|------------|
| TC-AVL-01 | Truy vấn khung giờ trống | 200, trả danh sách phòng khả dụng | ⏳ Chưa có API test |
| TC-AVL-02 | Kiểm tra cấu trúc response | JSON array; mỗi phòng có ID | ⏳ Chưa có API test |
| TC-AVL-03 | end ≤ start | 400 | ⏳ Chưa có API test |
| TC-AVL-04 | Thiếu start/end | 400 | ⏳ Chưa có API test |
| TC-AVL-05 | Giờ sai định dạng | 400 | ⏳ Chưa có API test |

### Schedule UI – `tests/e2e/schedule/room-schedule.spec.ts`

| ID | Mô tả | Kết quả mong đợi | Trạng thái |
|----|-------|------------------|------------|
| TC-UISCH-01 | Mở `/roomschedule` | Hiện tiêu đề và 6 dòng phòng mặc định | ✅ |
| TC-UISCH-02 | Lọc phòng A101 | Chỉ còn dòng A101 | ✅ |
| TC-UISCH-03 | Chọn phòng C302 | Trạng thái hiển thị Available | ✅ |
| TC-UISCH-04 | Đổi ngày | Tiêu đề lịch cập nhật theo ngày đã chọn | ✅ |

## Tuần 3 – Reservation API

Test được đặt tại `tests/api/reservations/reservations.spec.ts`; đang `@pending` đến khi M2 triển khai API và thống nhất request/response.

| ID | Mô tả | Kết quả mong đợi | Trạng thái |
|----|-------|------------------|------------|
| TC-RES-01 | Đặt phòng thành công | 201; room/date/start/end khớp request | ⏳ |
| TC-RES-02 | Tạo booking chồng lấn cùng phòng | Lần đầu 201, lần overlap 409 | ⏳ |
| TC-RES-03 | Booking liền kề (start bằng end booking trước) | Được chấp nhận, không tính overlap | ⏳ |
| TC-RES-04 | end bằng hoặc trước start | 400 | ⏳ |
| TC-RES-05 | Ngày/giờ sai định dạng hoặc thiếu trường | 400 | ⏳ |
| TC-RES-06 | Hủy booking vừa tạo | Hủy 200/204; trạng thái sau hủy là CANCELLED | ⏳ |
| TC-RES-07 | Hủy ID không tồn tại | 404 | ⏳ |

## Tuần 4 – kiểm thử concurrency

Test được đặt tại `tests/api/seats/seat-concurrency.spec.ts`; đang `@pending` đến khi Reservation/Seat API và dữ liệu ghế test sẵn sàng.

| ID | Mô tả | Kết quả mong đợi | Trạng thái |
|----|-------|------------------|------------|
| TC-CON-01 | Hai request đồng thời đặt cùng ghế/cùng khung giờ | Chính xác một request 200/201; request còn lại 409/422 | ⏳ |
| TC-CON-02 | Hai request đồng thời đặt cùng phòng/cùng khung giờ | Chính xác một request 200/201; request còn lại 409/422 | ⏳ |

**Điều kiện kiểm thử concurrency:** hai request phải dùng cùng tài nguyên và khung giờ, được gửi đồng thời trên DB test dùng chung. Không chấp nhận trường hợp cả hai request thành công. Chốt lại status code theo hợp đồng API trước khi bỏ `@pending`.
