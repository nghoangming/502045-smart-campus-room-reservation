# Database đồng bộ

Đây là bộ migration tuần tự cho PostgreSQL. Với database trống, chạy `migrations/001` đến `migrations/026` theo tên file. Với database đã có migration trước đó, chỉ chạy các file tiếp theo theo thứ tự; không chạy lại migration đã áp dụng. `004` chứa tài khoản, phòng, thiết bị và booking mẫu có ngày cố định 16/10/2026. Migration `024` bổ sung xác thực email cá nhân và khôi phục mật khẩu; BE hiện tại cần `024` vì JWT đọc `users.auth_version`.

## Chức năng và quy tắc dữ liệu

- Phòng: trigger lấy tiền tố mã phòng, `A → LAB` (thực hành), `B → THEORY` (lý thuyết), `C → SELF_STUDY` (tự học). Giá trị cuối lưu ở `rooms.type`. Trigger booking chỉ cho giảng viên đặt LAB/THEORY và sinh viên đặt SELF_STUDY.
- Booking: giữ exclusion constraint chống trùng phòng/giờ, kể cả hai giao dịch đồng thời. Buổi học phải khớp phòng/giờ với booking.
- Ghế: giữ 2 phút (`PENDING`), xác nhận (`CONFIRMED`), hủy (`CANCELLED`); một người một ghế trong **mỗi buổi học**. Các hàm `hold_class_seat`, `confirm_class_seat`, `cancel_class_seat` và view `class_seat_availability` thuộc bộ nền.
- Sau khi buổi học kết thúc, `026` khóa giữ, xác nhận và hủy ghế của sinh viên. Lịch sử ghế và sơ đồ phục vụ quản lý điểm danh vẫn có thể đọc; luồng Admin duyệt báo vắng vẫn có thể hủy ghế theo nghiệp vụ.
- Tài khoản: `users` có hồ sơ, khoa, xác thực tài khoản và trạng thái xác thực email cá nhân; `user_invites` giữ token kích hoạt. `faculties` ánh xạ 16 khoa theo mã A–P. `student_intake` giữ hồ sơ nhập từ CSV Google Form, `student_code_sequence` cấp mã theo khoa/năm. Mã được sinh ở lớp nghiệp vụ khi xử lý hồ sơ, không tự sinh khi chỉ INSERT hồ sơ.
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

Kiểm thử quy tắc khoa/phòng: `psql -v ON_ERROR_STOP=1 -f database/tests/verify_faculty_and_room_rules.sql` sau khi chạy migration trên DB thử. Script rollback dữ liệu và kiểm tra trigger khoa, lịch cùng/khác khoa, bốn năm nhập học, quyền đặt phòng và phòng bảo trì.

Nếu đã áp dụng phiên bản cũ của một migration lên DB có dữ liệu, không chạy lại nguyên file; tạo migration nâng cấp riêng khi cần. Kết quả kiểm tra cũ được ghi ở cuối tài liệu, không suy ra rằng 022–024 đã được kiểm tra cùng bộ đó.

## Trước khi dùng với ứng dụng

BE hiện có API cho ghế, QR, báo vắng, xóa phòng và tài nguyên, cùng xác thực email cá nhân/khôi phục mật khẩu. `spring.jpa.hibernate.ddl-auto=validate` không chạy migration và không chứng minh toàn bộ chức năng. Cần đối chiếu DB đang chạy với các migration và kiểm tra các luồng HTTP, SMTP, FE trên môi trường triển khai.

Tạo database với mã hóa UTF-8 để lưu tên khoa tiếng Việt. Chạy từng file bằng `psql -v ON_ERROR_STOP=1` trên database thử, theo đúng thứ tự; không chạy cả bộ trong một transaction vì các file nền có transaction riêng.

## 020: Chống trùng lịch và vòng đời booking

- Exclusion constraint chống trùng thời gian theo người đặt booking (GV giữa các phòng, kể cả PENDING). SV giữ/xác nhận ghế không thể trùng giờ giữa các buổi; tính cả PENDING chưa hết hạn. Hai khoảng tiếp giáp được phép. Constraint bảo vệ cả giao dịch đồng thời; hold hết hạn ở buổi khác được thu hồi khi đăng ký tiếp.
- `review_booking(booking_id, admin_id, approve, note)`: chỉ ADMIN, chỉ PENDING; true → CONFIRMED, false → REJECTED. Lưu người/giờ/ghi chú duyệt. Quy tắc phòng ACTIVE vẫn được kiểm tra lúc duyệt.
- `cancel_booking(booking_id, actor_id, reason)`: chủ booking hoặc ADMIN; PENDING/CONFIRMED → CANCELLED. Gọi lại trên booking đã hủy trả về bản ghi cũ. Lưu người/giờ/lý do hủy.
- Trigger cũng đồng bộ khi backend tin cậy UPDATE trạng thái trực tiếp: hủy ghế PENDING/CONFIRMED và thu hồi challenge QR/mã dự phòng trong cùng transaction. Không xóa lịch sử attendance/checkins. Hàm báo vắng GV cũ vẫn hoạt động và hiển thị ABSENT.
- Không mở lại booking CANCELLED/REJECTED. Buổi đã có lịch sử ghế không sửa phòng/giờ; hủy và tạo booking/buổi mới. Khoa vẫn hiển thị lịch bị hủy với CANCELLED/REJECTED; view ghế trả UNAVAILABLE khi booking chưa duyệt/đã hủy hoặc phòng không ACTIVE.
- Các ID tác nhân phải do backend xác thực cung cấp. Cấp EXECUTE các hàm review/cancel cho tài khoản backend tin cậy; không cấp client quyền UPDATE trực tiếp bảng booking. Hàm không SECURITY DEFINER và không thay thế xác thực.
- Migration dừng và rollback nếu dữ liệu cũ có lịch người đặt hoặc ghế SV trùng giờ. Không tự sửa lịch thật. Seed 004 mới đổi buổi A102 của demo teacher từ 09–11 sang 10–12; DB đã seed bản cũ cần rà soát xung đột trước khi chạy 020, không chạy lại 004 để chữa dữ liệu.
- Thử `database/tests/verify_booking_lifecycle.sql` và test khoa hiện có bằng psql với ON_ERROR_STOP=1. Chạy `python database/tests/verify_schedule_concurrency.py` với PSQL, PGHOST, PGPORT, PGUSER, PGDATABASE trỏ DB thử riêng. Test đồng thời tạo fixture đã commit, cần bỏ DB thử sau khi dùng.
- Các thao tác khóa nhiều đối tượng vẫn có thể bị PostgreSQL hủy do deadlock/serialization dưới tải; backend cần retry toàn transaction khi SQLSTATE 40P01/40001. Xung đột exclusion 23P01 là lỗi lịch trùng cần báo người dùng.
## 021: Đồng bộ quyền và quy trình điểm danh (12/11/2026)

Sau 020, chạy `migrations/021_rbac_attendance_workflows.sql` một lần. DB đã có 020 thì tiếp tục từ 021; không chạy lại seed hay migration cũ. Transaction sẽ rollback nếu rooms.status cũ nằm ngoài ACTIVE/MAINTENANCE/INACTIVE; đối chiếu dữ liệu trước khi nâng cấp.

- Mục 3–8: ghi INSERT/UPDATE/DELETE attendance vào audit_logs, chặn UPDATE/DELETE/TRUNCATE log; thêm quyền xem điểm danh bản thân, quyền đặt SELF_STUDY/xem phòng cho SV và xem thiết bị/quản lý điểm danh cho GV. Gỡ quyền tạo đơn vắng của ADMIN và chọn ghế của GV. Tài khoản nhiều vai vẫn có thể dùng quyền của vai SV/GV tương ứng.
- `own_attendance` chỉ trả dữ liệu của SV trong context; `correct_attendance(id,status,reason)` chỉ cho GV phụ trách sửa, bắt buộc lý do; `list_room_resources(room_id)` kiểm quyền xem thiết bị. Backend phải đặt app.user_id/app.role từ phiên đã xác thực bằng SET LOCAL trong cùng transaction. Audit giữ actor NULL khi thao tác hệ thống không có context, không giả mạo người sửa.
- Mục 9–10: `room_capacity` tính số ghế lắp đặt/khả dụng từ seats, không tạo capacity thứ hai. Giữ lịch theo khoa ở 018/020; roster ở đây là SV đã xác nhận ghế, không tự thêm lớp học phần/enrollment.
- Mục 11: chủ booking chỉ hủy trước giờ bắt đầu, ADMIN có context hợp lệ được ngoại lệ. `workflow_rules.cancellation_lead_minutes` mặc định 0, có thể tăng khi thống nhất nghiệp vụ. Trigger chặn cả UPDATE trực tiếp; báo vắng GV đã duyệt tiếp tục theo hạn riêng của 011.
- Quy tắc hủy và xung đột lịch ở 020, chặn phòng bảo trì ở 019. BE dùng `review_booking` để duyệt yêu cầu; ràng buộc trạng thái phòng được bổ sung ở 025.
- Mục 15: check-in từ phút 15 là LATE (cấu hình `workflow_rules.late_after_minutes`, mặc định 15), vẫn giữ khung QR [5,20) và token tối đa 2 phút. Thu hồi LATE và quét lại được hỗ trợ. `finalize_class_attendance(session_id)` do GV phụ trách gọi sau đóng check-in, ghi ABSENT cho SV có ghế CONFIRMED chưa điểm danh/PENDING; giữ PRESENT/LATE/EXCUSED và không ghi lặp. Đây là hàm tổng kết, backend cần gọi sau đóng cửa sổ hoặc khi GV tổng kết; không tự có scheduler chỉ nhờ migration.

Các mốc phút 15 và hủy trước giờ bắt đầu là mặc định triển khai mới, không được coi là nguyên văn SRS. Chỉ role triển khai được sửa workflow_rules; backend cần SELECT bảng này để các hàm/trigger đọc cấu hình. Cấp SELECT trên view và EXECUTE trên hàm cần dùng cho backend tin cậy; không cấp client quyền ghi trực tiếp. Hàm mới dùng SECURITY INVOKER trừ trigger ghi audit có SECURITY DEFINER/search_path cố định; owner của trigger phải sở hữu audit_logs và không phải tài khoản ứng dụng. Không cấp ứng dụng quyền đổi trigger hoặc sửa log. Xác thực người dùng và đặt DB context là trách nhiệm của BE.

Ghi nhận kiểm tra trước đây: 001–021 đã chạy trên PostgreSQL 18 thử riêng; các script `verify_booking_lifecycle.sql`, `verify_faculty_and_room_rules.sql`, `verify_rbac_attendance_workflows.sql` từng PASS. Ghi nhận này không bao gồm 022–024, HTTP, SMTP hoặc mọi DB role triển khai.

## 022–024: Xóa dữ liệu và khôi phục tài khoản

- `022_room_resource_deletion.sql`: hàm xóa phòng chưa có lịch sử phụ thuộc và xóa tài nguyên phòng theo ràng buộc nghiệp vụ. BE gọi các hàm này qua `DELETE /rooms/{id}` và `DELETE /resources/{id}` với quyền ADMIN.
- `023_notify_admin_teacher_absence.sql`: trigger thông báo cho ADMIN khi giảng viên gửi yêu cầu báo vắng.
- `024_account_recovery.sql`: thêm `users.personal_email_verified`, `users.auth_version` và `account_action_tokens` cho xác thực email cá nhân mới và đặt lại mật khẩu. Với dữ liệu cũ, chỉ đánh dấu email cá nhân đã xác thực nếu khớp hồ sơ `student_intake` và tài khoản đã kích hoạt. Link đổi email hết hạn sau 24 giờ; link đặt lại mật khẩu hết hạn sau một giờ; mỗi link dùng một lần. Đổi email yêu cầu mật khẩu hiện tại, email mới chỉ được lưu sau khi người dùng bấm link. Đổi/đặt lại mật khẩu tăng `auth_version`, khiến JWT đã cấp trước đó hết hiệu lực.

Người dùng đã xác nhận chạy `024` trên DB đang sử dụng ngày 25/11/2026. Đây là thông tin vận hành do người dùng cung cấp; tài liệu này không thay thế việc đối chiếu schema hay kiểm tra luồng SMTP trên DB đó.

## 025: Ràng buộc trạng thái phòng

Chạy `migrations/025_room_status_constraint.sql` một lần sau 024. Phòng chỉ nhận `ACTIVE` hoặc `MAINTENANCE`, khớp với BE và FE hiện tại. Migration dừng và rollback nếu có phòng mang trạng thái khác; kiểm tra, sửa dữ liệu đó trước khi chạy lại. BE trả lỗi 409 có thể thử lại khi PostgreSQL hủy một giao dịch đồng thời với SQLSTATE `40P01` hoặc `40001`.

## 026: Khóa ghế sau khi buổi học kết thúc

Chạy `migrations/026_lock_seats_after_class_end.sql` một lần sau 025 trên database đang dùng. Migration thay các hàm giữ, xác nhận, hủy ghế và trigger bảo vệ ghi trực tiếp; dùng `class_sessions.end_time` làm mốc đóng. Không xóa lịch sử ghế hay điểm danh. Sinh viên không thể đặt lại hoặc hủy ghế sau mốc này; việc Admin hủy ghế khi duyệt báo vắng và dọn các hold hết hạn vẫn hoạt động.
