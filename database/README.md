# Database CNPM: cách chạy và giải thích index, seed, Hibernate

Project: `D:\CNPM_CK\502045-smart-campus-room-reservation`.

Database sử dụng là **CNPM**, trên PostgreSQL 18, `localhost:5432`, tài khoản `postgres`. Tên cũ có dấu cách ở cuối đã được đổi thành `CNPM`; đây là thao tác đổi tên database hiện có, không phải tạo database khác rồi chép dữ liệu.

## 1. Cấu hình và cách chạy hiện tại

Trong `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/CNPM}
spring.datasource.username=${DB_USERNAME:postgres}
spring.datasource.password=${DB_PASSWORD:postgres}
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=false
```

Phần trước dấu `:` trong `${DB_URL:...}` là tên biến môi trường. Nếu có DB_URL, giá trị đó được ưu tiên; nếu không có thì dùng URL mặc định phía sau dấu `:`. Khi tự chạy bằng IDE, kiểm tra Run Configuration nếu backend vẫn trỏ vào database cũ.

Bạn tự quản lý các file SQL bằng pgAdmin. Backend local không tự chạy migration hoặc seed. Hibernate kiểm tra schema qua `validate`, không tự tạo hoặc sửa bảng.

Trong **PowerShell**, chạy:

```powershell
cd D:\CNPM_CK\502045-smart-campus-room-reservation
powershell -ExecutionPolicy Bypass -File .\backend\Run-Local.ps1
```

Script hỏi mật khẩu PostgreSQL, đặt biến môi trường cho tiến trình, chạy profile dev và buộc tắt Flyway cho lần chạy local đó. Mật khẩu không được lưu vào file. Project yêu cầu Java 25; script dùng JAVA_HOME hoặc tìm Java 25 đi kèm VS Code.

Frontend chạy ở terminal PowerShell khác:

```powershell
cd D:\CNPM_CK\502045-smart-campus-room-reservation\frontend
npm.cmd run dev
```

Mở `http://localhost:5173/login`. API được Vite chuyển tiếp tới backend ở `http://localhost:8080`.

Trong pgAdmin, Refresh danh sách Databases và mở Query Tool trên CNPM sau khi đổi tên. Tab cũ gắn với tên database cũ có thể cần đóng rồi mở lại.

## 2. Vai trò của bốn file SQL

| File | Câu hỏi nó giải quyết |
| --- | --- |
| 001_create_tables.sql | Cần lưu những loại dữ liệu nào, trong những bảng và cột nào? |
| 002_createRole_Rbac.sql | Có những role/permission nào và liên kết chúng ra sao? |
| 003_create_room_indexes.sql | Hỗ trợ truy vấn nào chạy nhanh hơn, và ràng buộc thời gian booking thế nào? |
| 004_create_seed.sql | Dùng dữ liệu cụ thể nào để thử chức năng? |

Trên database trống, thứ tự chạy là 001 → 002 → 003 → 004. CNPM hiện đã có các bảng, index và dữ liệu mẫu; không cần chạy lại toàn bộ file chỉ để kết nối backend.

## 3. Giải thích file 003_create_room_indexes.sql

Index giống mục lục của sách: giúp PostgreSQL tìm các dòng phù hợp thay vì luôn phải đọc toàn bộ bảng. Nó là cấu trúc bổ sung tham chiếu tới dữ liệu, không phải bảng dữ liệu mẫu mới. Index cũng tốn dung lượng và công cập nhật khi ghi dữ liệu, nên cần gắn với truy vấn cụ thể.

| Thành phần | Ý nghĩa |
| --- | --- |
| idx_rooms_status_location | Index kết hợp status và location; có thể hỗ trợ WHERE theo status và theo cặp status/location. |
| idx_bookings_room_active_time | Index room_id, start_time, end_time, chỉ gồm booking chưa bị hủy/từ chối. Hỗ trợ truy vấn tìm booking giao với khung giờ. |
| idx_users_email_lower | Index trên kết quả lower(email), phù hợp truy vấn đăng nhập dùng lower(email). |
| idx_users_user_code_lower | Tương tự cho lower(user_code). |
| idx_user_roles_role | Hỗ trợ tra các liên kết user_roles theo role_id. |
| chk_bookings_time_range | CHECK bắt buộc start_time < end_time; đây là ràng buộc dữ liệu, không phải index. |

Ví dụ:

```sql
CREATE INDEX idx_rooms_status_location ON rooms (status, location);
```

Cột đứng đầu là status. Index này thường hữu ích cho điều kiện theo status hoặc cả status và location; truy vấn chỉ theo location không phải trường hợp phù hợp nhất. PostgreSQL tự quyết định có dùng index không. Với sáu phòng mẫu, nó có thể chọn đọc cả bảng vì rẻ hơn, và đó là bình thường.

Trong code hiện tại, `RoomService` lấy phòng bằng `findAll()` rồi lọc status trong Java. Vì vậy index status/location chưa trực tiếp giúp bước lọc này. Truy vấn tìm booking trùng giờ đã nằm trong repository và có điều kiện SQL/HQL phù hợp với index booking.

Index booking có `WHERE upper(status) NOT IN (...)`, gọi là **partial index**: chỉ một phần dòng được đưa vào index. Booking CANCELLED/CANCELED/REJECTED vẫn tồn tại trong bảng để giữ lịch sử, nhưng không nằm trong index này.

Hai khoảng thời gian giao nhau khi:

```text
booking.start_time < requested.end_time
AND booking.end_time > requested.start_time
```

Booking 08:00–10:00 làm phòng bận nếu yêu cầu 09:00–11:00. Nếu yêu cầu bắt đầu đúng 10:00, hai khoảng không giao nhau. Index hỗ trợ tìm kiếm; logic điều kiện mới quyết định có giao nhau hay không. CHECK thời gian không ngăn hai booking khác nhau trùng lịch.

`room_code` đã có UNIQUE trong file 001, nên PostgreSQL đã tạo index phục vụ tính duy nhất đó. Không cần tạo thêm một index giống hệt.

Lưu ý trên bản file bạn đang có: khối SELECT kiểm tra kết nối/danh sách bảng ở đầu file 003 đang được bọc trong dấu nháy đơn. Nếu muốn chạy cả file như SQL, cần bỏ cặp dấu nháy bao ngoài hoặc chuyển khối kiểm tra sang một tab Query Tool riêng. Khối SELECT này chỉ đọc thông tin, không tạo index. Các lệnh CREATE INDEX và ADD CONSTRAINT hiện không được thiết kế để cứ chạy lại nhiều lần; nếu đối tượng đã tồn tại, PostgreSQL sẽ báo trùng.

## 4. Giải thích file 004_create_seed.sql

Seed là dữ liệu mẫu có chủ đích để kiểm thử những tình huống nghiệp vụ. Nó không phải cấu hình kết nối, cũng không thay thế việc tạo bảng.

**Khối users:** tạo admin, teacher, student. password_hash lưu chuỗi BCrypt, không lưu mật khẩu gốc. Khi đăng nhập, backend dùng BCrypt để so sánh mật khẩu người dùng nhập với hash đã lưu. Mật khẩu tài khoản ứng dụng khác mật khẩu PostgreSQL của user postgres.

| Username | Mật khẩu mẫu | Role được gán |
| --- | --- | --- |
| admin | Admin@123 | ADMIN |
| teacher | Teacher@123 | TEACHER |
| student | Student@123 | STUDENT |

**Khối user_roles:** lấy các cặp username/role trong VALUES, JOIN sang users và roles để tìm ID thật, rồi ghi vào bảng liên kết. Role phải được tạo từ file 002 trước. Cách này không giả định admin luôn có user_id = 1 hoặc ADMIN luôn có role_id = 1; identity có thể đã tăng do lần chèn trước đó.

Ví dụ `AS demo(user_code, role_name)` đặt tên cho một bảng giá trị tạm trong câu SELECT. Nó không tạo thêm một bảng vật lý tên demo trong database.

**Khối rooms:** tạo sáu phòng. ACTIVE mô tả trạng thái vận hành, không có nghĩa phòng luôn trống mọi giờ. Bận/trống theo giờ được tính từ bookings. B202 có MAINTENANCE nên backend loại khỏi danh sách phòng có thể sử dụng.

**Khối bookings:** tạo bốn lịch vào ngày cố định 2026-10-16, dùng timestamp có múi giờ +07. Lấy user_id và room_id thông qua username/room_code, không ghi cứng các số ID.

| Phòng | Giờ Việt Nam | Trạng thái | Mục đích thử |
| --- | --- | --- | --- |
| A101 | 08:00–10:00 | APPROVED | Kiểm tra giao giờ và ranh giới kết thúc. |
| A102 | 09:00–11:00 | APPROVED | Kiểm tra giao một phần với 08:00–10:00. |
| B201 | 13:00–15:00 | APPROVED | Phòng có lịch buổi chiều nhưng trống buổi sáng. |
| C301 | 08:00–10:00 | CANCELLED | Lịch đã hủy không chiếm phòng. |

`ON CONFLICT DO NOTHING` bỏ qua INSERT nếu gặp xung đột UNIQUE/PRIMARY KEY phù hợp. Nó không cập nhật dữ liệu cũ, không sửa mật khẩu cũ, và không bỏ qua mọi loại lỗi như khóa ngoại sai.

Bookings dùng WHERE NOT EXISTS để tránh thêm lại cùng user, phòng, thời gian và status. Với dữ liệu không đổi, chạy lại seed không thêm booking trùng theo các trường đó.

Chú thích đầu file còn ghi development-only từ cách bố trí cũ. Chú thích không kiểm soát việc chạy SQL: khi bạn mở và chạy tay trong pgAdmin, câu INSERT sẽ chạy trên database của tab hiện tại. Chuyển seed vào migrations cũng không tự đảm bảo dev-only nếu sau này bật Flyway; cấu hình local hiện đã tắt Flyway theo cách làm thủ công của bạn.

## 5. Hibernate xuất hiện khi backend chạy nghĩa là gì?

PostgreSQL là nơi lưu bảng và dữ liệu. Hibernate là thư viện Java giúp ánh xạ bảng/dòng dữ liệu thành object Java và tạo SQL cho những thao tác JPA.

Luồng xem phòng hiện tại:

```text
Frontend → RoomController → RoomService → RoomRepository
         → Hibernate → PostgreSQL JDBC driver → PostgreSQL CNPM
```

`RoomRepository extends JpaRepository<Room, Long>` cung cấp các thao tác như findAll/findById. Hibernate thực hiện việc đọc/ánh xạ dữ liệu qua JDBC. HikariCP là pool quản lý và tái sử dụng các kết nối DB. Phần đăng nhập trong code hiện tại dùng JdbcTemplate để đọc users/roles, nên không phải mọi API đều đi qua Hibernate.

Trong Room.java:

```java
@Entity
@Table(name = "rooms")
public class Room {
    @Id
    @Column(name = "room_id")
    private Long id;
}
```

`@Entity` cho biết đây là class được quản lý để lưu/đọc dữ liệu; `@Table` trỏ vào bảng rooms; `@Id` là khóa chính; `@Column` ánh xạ field id của Java với cột room_id của SQL. Một dòng rooms trở thành một object Room.

Với `spring.jpa.hibernate.ddl-auto=validate`, Hibernate kiểm tra bảng/cột/kiểu dữ liệu được các entity ánh xạ. Nó không tự tạo/sửa bảng, không tự chạy file 003/004, và không xác nhận đầy đủ mọi index, constraint hoặc dữ liệu seed.

Log INFO có Hibernate thường là thông tin khởi động: đọc entity, xác định PostgreSQL/dialect, thiết lập EntityManagerFactory. Chỉ thấy chữ Hibernate không có nghĩa là lỗi, và cũng chưa đủ để kết luận cả hệ thống đã kết nối thành công.

Ví dụ lỗi cần phân biệt:

- `password authentication failed`: sai tài khoản/mật khẩu kết nối PostgreSQL.
- `database ... does not exist`: URL trỏ sai tên database.
- `Schema-validation: missing table [rooms]`: kết nối được nhưng schema không khớp entity.
- `Started SmartCampusBackendApplication`: ứng dụng đã hoàn tất khởi động; tiếp tục gọi API đọc dữ liệu để kiểm tra luồng thực tế.

## 6. Tự xác nhận kết nối CNPM

Trong Query Tool của pgAdmin:

```sql
SELECT current_database(), current_user;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM roles;
SELECT COUNT(*) FROM rooms;
SELECT COUNT(*) FROM bookings;
```

Hiện dữ liệu kiểm tra được là CNPM, 3 users, 3 roles, 6 rooms, 4 bookings. Bảng system_logs của bạn cũng nằm trong CNPM.

Sau khi khởi động backend, trong PowerShell:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/rooms
```

Kết quả là các dòng phòng từ DB qua Hibernate/JPA rồi trả thành JSON. Vào Room Schedule, chọn 2026-10-16, 08:00–10:00: phòng trống dự kiến B201, C301, C302. B202 bảo trì; A101/A102 bận. Đổi 10:00–11:00: A101 trống nhưng A102 vẫn bận.

## 7. Test và CI tách khỏi dữ liệu môn học

Profile integration-test dành cho kiểm thử migration tự động trên database riêng; cần TEST_DB_URL, TEST_DB_USERNAME, TEST_DB_PASSWORD. Mặc định test trỏ vào smart_campus_test, không trỏ CNPM. Chỉ profile test hoặc CI mới bật Flyway để kiểm tra SQL trên database thử.

Trạng thái SQL hiện tại có cặp dấu nháy bao khối SELECT ở đầu file 003, nên chưa thể khẳng định chạy cả bộ migration trên DB trống sẽ thành công trước khi bạn sửa khối đó. Điều này không cản backend local đọc schema CNPM đã được tạo thủ công vì Flyway local đã tắt.

Tài liệu tham khảo: [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/18/sql-createindex.html), [Hibernate ORM](https://docs.hibernate.org/orm/7.4/introduction/html_single/).
