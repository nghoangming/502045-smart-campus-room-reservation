# Database đồng bộ

Đây là bộ migration **độc lập** cho một PostgreSQL database trống. Chạy `migrations/001` đến `migrations/020` theo tên file. Các file `001`–`016` dựa trên `../database/migrations`; quy tắc phòng, báo vắng, điểm danh và phân quyền được gộp vào file chức năng tương ứng. File `017` bổ sung hồ sơ tài khoản và tiếp nhận sinh viên chưa có ở bộ nền. Không chạy thêm `../migrations` hoặc `../migrations/fresh` vào cùng database. `004` chứa tài khoản, phòng, thiết bị và booking mẫu; các booking mẫu có ngày cố định 16/10/2026.

## Chức năng và quy tắc dữ liệu

- Phòng: trigger lấy tiền tố mã phòng, `A → LAB` (thực hành), `B → THEORY` (lý thuyết), `C → SELF_STUDY` (tự học). Giá trị cuối lưu ở `rooms.type`. Trigger booking chỉ cho giảng viên đặt LAB/THEORY và sinh viên đặt SELF_STUDY.
- Booking: giữ exclusion constraint chống trùng phòng/giờ, kể cả hai giao dịch đồng thời. Buổi học phải khớp phòng/giờ với booking.
- Ghế: giữ 2 phút (`PENDING`), xác nhận (`CONFIRMED`), hủy (`CANCELLED`); một người một ghế trong **mỗi buổi học**. Các hàm `hold_class_seat`, `confirm_class_seat`, `cancel_class_seat` và view `class_seat_availability` thuộc bộ nền.
- Tài khoản: `users` có hồ sơ, khoa và xác thực email; `user_invites` giữ token kích hoạt. `faculties` ánh xạ 16 khoa theo mã A–P. `student_intake` giữ CSV Google Form để admin duyệt, `student_code_sequence` cấp mã theo khoa/năm. Mã được sinh ở lớp nghiệp vụ khi duyệt, không tự sinh khi chỉ INSERT hồ sơ.
- Báo vắng giảng viên: chỉ gửi cho buổi đã duyệt, chậm nhất 60 phút trước giờ bắt đầu. Admin có thể duyệt yêu cầu gửi đúng hạn sau mốc này. Khi còn chờ duyệt, lịch sinh viên vẫn hiển thị bình thường; khi duyệt, `review_teacher_absence` giải phóng phòng/ghế và trigger tạo thông báo cho giảng viên cùng sinh viên đã xác nhận ghế trong một transaction.
- Báo vắng sinh viên: phải có ghế `CONFIRMED` trong buổi đó và gửi chậm nhất 15 phút trước giờ bắt đầu. Giảng viên dạy buổi đó dùng `review_student_absence` để duyệt hoặc từ chối; duyệt sẽ ghi `EXCUSED` vào điểm danh. `class_session_calendar` suy trạng thái buổi học từ yêu cầu giảng viên đã duyệt; đơn đang chờ không làm đổi lịch sinh viên.
- Điểm danh: `checkin_challenges` có QR và mã dự phòng; mã chỉ phát từ phút 5 đến phút 20 sau giờ bắt đầu, tối đa 2 phút hiệu lực. `revoke_class_checkin` cho giảng viên hủy kết quả, giữ check-in cũ với `revoked_at/by`. Sinh viên có thể quét lại trong khung giờ; một attendance hiện hành cho mỗi sinh viên/buổi học.
- Thiết bị, sự cố, thông báo, audit và RLS lấy từ bộ nền. Resource trong sự cố phải thuộc đúng phòng. Quyền báo sự cố của sinh viên được gỡ; chính sách INSERT sự cố chỉ nhận giảng viên.

## Phạm vi chưa chốt

Mô hình đã chốt theo khoa, không có lớp học phần hoặc lớp đại cương: mọi sinh viên cùng khoa đều thấy buổi học đã duyệt và được chọn ghế, không phân biệt năm 1–4. Không tự đặt ghế cho sinh viên.

- `018`: giữ năm nhập học; seed CNTT (`A`), QTKD (`K`), Luật (`I`) theo mã khoa đã có ở 017. `users.faculty_code` là khóa ngoại chuẩn; trường `faculty` cũ chỉ dùng hiển thị. Demo teacher/student thuộc CNTT; tài khoản thật chưa rõ khoa phải được gán khoa trước khi tạo lịch/đăng ký ghế.
- Trigger tự điền `class_sessions.faculty_code` từ giảng viên khi tạo buổi học. Không cần truyền khoa từ giao diện; không được sửa khoa thủ công. Đổi khoa giảng viên sau này không đổi khoa của lịch cũ.
- Truy vấn lịch SV bằng `student_faculty_calendar`. Đặt `app.user_id` và `app.role='STUDENT'` bằng `SET LOCAL` trong cùng transaction. View tự lọc khoa và chỉ hiện lịch đã duyệt hoặc lịch báo vắng đã duyệt; sinh viên mới được gán khoa cũng tự thấy lịch, không cần tạo bản ghi cho từng SV. Không có điều kiện lọc `entry_year`.
- Trigger ghế chặn SV khác khoa, kể cả ghi trực tiếp. Các hàm giữ/xác nhận/hủy ghế của 015 vẫn dùng như cũ.
- `019`: chỉ SV đặt SELF_STUDY, GV đặt LAB/THEORY; booking mới, duyệt lại và đăng ký/xác nhận ghế chỉ được thực hiện khi phòng `ACTIVE`. Vẫn cho hủy khi phòng bảo trì. Đổi phòng sang bảo trì không tự hủy các booking có sẵn.
- View là giao diện truy vấn cho backend tin cậy, không phải cơ chế RLS trên toàn bộ bảng lịch. Không cấp quyền đọc trực tiếp bảng lịch hoặc view lịch chung cho client SV. Các hàm SQL nhận ID từ backend đã xác thực; không nhận ID tự khai từ client. Cấp EXECUTE cho tài khoản backend với các hàm đã REVOKE PUBLIC ở migration trước.

Kiểm thử mới: `psql -v ON_ERROR_STOP=1 -f db-sync/tests/verify_faculty_and_room_rules.sql` sau khi chạy 001–019 trên DB thử. Test rollback dữ liệu và kiểm tra trigger khoa, lịch cùng/khác khoa, bốn năm nhập học, quyền đặt phòng và phòng bảo trì.

018 đã được mở rộng theo yêu cầu. Nếu đã áp dụng bản 018 cũ lên DB có dữ liệu, không chạy lại nguyên file; cần migration nâng cấp riêng cho DB đó. Bộ này được kiểm tra theo cách tạo DB trống rồi chạy 001–020.

## Trước khi dùng với ứng dụng

BE hiện dùng cách ghi ghế và QR cũ, nên phải đổi API theo các hàm của bộ DB này. Entity `Room` cũng cần ánh xạ sang `rooms.type`. `spring.jpa.hibernate.ddl-auto=validate` chỉ kiểm tra entity, không chứng minh toàn bộ chức năng. Cần chạy migration trên DB thử, chạy các SQL test trong `../database/tests`, rồi kiểm tra end to end trước khi chuyển DB thật.

Tạo database với mã hóa UTF-8 để lưu tên khoa tiếng Việt. Chạy từng file bằng `psql -v ON_ERROR_STOP=1` trên database thử, theo đúng thứ tự; không chạy cả bộ trong một transaction vì các file nền có transaction riêng.

## 020: Chống trùng lịch và vòng đời booking

- Exclusion constraint chống trùng thời gian theo người đặt booking (GV giữa các phòng, kể cả PENDING). SV giữ/xác nhận ghế không thể trùng giờ giữa các buổi; tính cả PENDING chưa hết hạn. Hai khoảng tiếp giáp được phép. Constraint bảo vệ cả giao dịch đồng thời; hold hết hạn ở buổi khác được thu hồi khi đăng ký tiếp.
- `review_booking(booking_id, admin_id, approve, note)`: chỉ ADMIN, chỉ PENDING; true → CONFIRMED, false → REJECTED. Lưu người/giờ/ghi chú duyệt. Quy tắc phòng ACTIVE vẫn được kiểm tra lúc duyệt.
- `cancel_booking(booking_id, actor_id, reason)`: chủ booking hoặc ADMIN; PENDING/CONFIRMED → CANCELLED. Gọi lại trên booking đã hủy trả về bản ghi cũ. Lưu người/giờ/lý do hủy.
- Trigger cũng đồng bộ khi backend tin cậy UPDATE trạng thái trực tiếp: hủy ghế PENDING/CONFIRMED và thu hồi challenge QR/mã dự phòng trong cùng transaction. Không xóa lịch sử attendance/checkins. Hàm báo vắng GV cũ vẫn hoạt động và hiển thị ABSENT.
- Không mở lại booking CANCELLED/REJECTED. Buổi đã có lịch sử ghế không sửa phòng/giờ; hủy và tạo booking/buổi mới. Khoa vẫn hiển thị lịch bị hủy với CANCELLED/REJECTED; view ghế trả UNAVAILABLE khi booking chưa duyệt/đã hủy hoặc phòng không ACTIVE.
- Các ID tác nhân phải do backend xác thực cung cấp. Cấp EXECUTE các hàm review/cancel cho tài khoản backend tin cậy; không cấp client quyền UPDATE trực tiếp bảng booking. Hàm không SECURITY DEFINER và không thay thế xác thực.
- Migration dừng và rollback nếu dữ liệu cũ có lịch người đặt hoặc ghế SV trùng giờ. Không tự sửa lịch thật. Seed 004 mới đổi buổi A102 của demo teacher từ 09–11 sang 10–12; DB đã seed bản cũ cần rà soát xung đột trước khi chạy 020, không chạy lại 004 để chữa dữ liệu.
- Thử `db-sync/tests/verify_booking_lifecycle.sql` và test khoa hiện có bằng psql với ON_ERROR_STOP=1. Chạy `python db-sync/tests/verify_schedule_concurrency.py` với PSQL, PGHOST, PGPORT, PGUSER, PGDATABASE trỏ DB thử riêng. Test đồng thời tạo fixture đã commit, cần bỏ DB thử sau khi dùng.
- Các thao tác khóa nhiều đối tượng vẫn có thể bị PostgreSQL hủy do deadlock/serialization dưới tải; backend cần retry toàn transaction khi SQLSTATE 40P01/40001. Xung đột exclusion 23P01 là lỗi lịch trùng cần báo người dùng.
