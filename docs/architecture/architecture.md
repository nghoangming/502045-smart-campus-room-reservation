# Kiến trúc hệ thống

Hệ thống Smart Campus chia thành 5 tầng: trình bày, API, nghiệp vụ, truy cập dữ liệu và cơ sở dữ liệu. Đặc tả API xem tại [openapi-spec.yaml](openapi-spec.yaml).

## Luồng tài khoản hiện tại

Frontend Next.js gọi `/api/v1` qua rewrite đến Spring Boot. API xác thực bằng JWT có thời hạn một giờ; `users.auth_version` từ migration 024 cho phép vô hiệu hóa JWT đã cấp khi đổi hoặc đặt lại mật khẩu. BE dùng PostgreSQL với các migration `database/migrations/001`–`026`.

Admin có thể tạo tài khoản giảng viên thủ công và nhập hồ sơ sinh viên từ CSV Google Form. Sinh viên được cấp mã/email đăng nhập theo khoa và năm; link kích hoạt được gửi đến email cá nhân trong hồ sơ. Khi người dùng muốn đổi email cá nhân, BE kiểm tra mật khẩu hiện tại rồi gửi link xác thực đến email mới; địa chỉ chỉ cập nhật sau khi link được dùng. Quên mật khẩu dùng email cá nhân đã xác thực, token một lần và trang đặt lại mật khẩu; sau đó người dùng đăng nhập lại. Các đường dẫn, payload và trạng thái triển khai được ghi trong OpenAPI.

![Hình 1. Kiến trúc phân tầng](../images/02_kien_truc_phan_tang.png)

*Hình 1. Kiến trúc phân tầng của hệ thống Smart Campus.*
