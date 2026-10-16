# Test Cases – Tuần 2

Trạng thái: ✅ chạy được ngay · ⏳ @pending (chờ endpoint)

## Login – UI (`tests/e2e/login/login.spec.ts`)
| ID | Mô tả | Kết quả mong đợi | TT |
|----|-------|------------------|----|
| TC-LOGIN-01 | Mở /login | Thấy form Username, Password, nút Sign in | ✅ |
| TC-LOGIN-02 | Nhập admin/admin123 | Chuyển /dashboard, lưu `smartCampusLoggedIn=true` | ✅ |
| TC-LOGIN-03 | Sai mật khẩu | Hiện lỗi "Incorrect username or password", ở lại /login | ✅ |
| TC-LOGIN-04 | Sai username | Hiện lỗi sai thông tin | ✅ |
| TC-LOGIN-05 | Để trống cả hai ô | Hiện "Please enter both username and password" | ✅ |
| TC-LOGIN-06 | Chỉ nhập username | Hiện thông báo yêu cầu nhập đủ | ✅ |
| TC-LOGIN-07 | Bấm Show/Hide | Đổi type password ↔ text | ✅ |
| TC-LOGIN-08 | Vào URL không tồn tại | Chuyển về trang login | ✅ |

## Auth – API (`tests/api/auth/login.spec.ts`)
| ID | Mô tả | Kết quả mong đợi | TT |
|----|-------|------------------|----|
| TC-AUTH-01 | POST /auth/login đúng | 200, có JWT | ⏳ |
| TC-AUTH-02 | Response | Không chứa password/hash | ⏳ |
| TC-AUTH-03 | Sai mật khẩu | 401 | ⏳ |
| TC-AUTH-04 | Email không tồn tại | 401, cùng thông báo với sai mật khẩu | ⏳ |
| TC-AUTH-05 | Thiếu password | 400 | ⏳ |
| TC-AUTH-06 | Body rỗng | 400 | ⏳ |
| TC-AUTH-07 | Student đăng nhập | 200, role = STUDENT | ⏳ |

## Room API (`tests/api/rooms/rooms.spec.ts`)
| ID | Mô tả | Kết quả mong đợi | TT |
|----|-------|------------------|----|
| TC-ROOM-01 | GET /rooms | 200, mảng không rỗng, JSON | ✅ |
| TC-ROOM-02 | Mỗi phòng | Có id, name | ✅ |
| TC-ROOM-03 | Id các phòng | Không trùng | ✅ |
| TC-ROOM-04 | GET /rooms/{id} hợp lệ | 200, đúng id | ✅ |
| TC-ROOM-05 | GET /rooms/{id} không tồn tại | 404, body {status, message} | ✅ |
| TC-HEALTH-01 | GET /health | 200 | ✅ |

## Schedule API (`tests/api/rooms/schedule.spec.ts`)
| ID | Mô tả | Kết quả mong đợi | TT |
|----|-------|------------------|----|
| TC-SCH-01 | Lịch theo ngày | 200, mảng | ⏳ |
| TC-SCH-02 | Mỗi mục lịch | start < end | ⏳ |
| TC-SCH-03 | Ngày không có lịch | 200, mảng rỗng | ⏳ |
| TC-SCH-04 | date sai định dạng | 400 | ⏳ |
| TC-SCH-05 | Thiếu date | 400 | ⏳ |
| TC-SCH-06 | Phòng không tồn tại | 404 | ⏳ |

## Availability API (`tests/api/rooms/availability.spec.ts`)
| ID | Mô tả | Kết quả mong đợi | TT |
|----|-------|------------------|----|
| TC-AVL-01 | Khung giờ trống | 200, available=true | ⏳ |
| TC-AVL-02 | Kiểu dữ liệu | available là boolean | ⏳ |
| TC-AVL-03 | end ≤ start | 400 | ⏳ |
| TC-AVL-04 | Thiếu start/end | 400 | ⏳ |
| TC-AVL-05 | Giờ sai định dạng | 400 | ⏳ |
| TC-AVL-06 | Phòng không tồn tại | 404 | ⏳ |

## Room Schedule – UI (`tests/e2e/schedule/room-schedule.spec.ts`)
| ID | Mô tả | Kết quả mong đợi | TT |
|----|-------|------------------|----|
| TC-UISCH-01 | Mở /roomschedule | Có tiêu đề, bảng 6 dòng | ✅ |
| TC-UISCH-02 | Lọc phòng A101 | Còn 1 dòng A101 | ✅ |
| TC-UISCH-03 | Phòng C302 | Trạng thái Available | ✅ |
| TC-UISCH-04 | Đổi ngày | Tiêu đề "Schedule: <ngày>" cập nhật | ✅ |
