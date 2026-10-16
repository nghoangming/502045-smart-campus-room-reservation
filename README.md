# Smart Campus – Hệ thống quản lý Smart Campus

## 1. Giới thiệu đề tài

**Smart Campus** là hệ thống hỗ trợ quản lý và sử dụng phòng học, phòng tự học và chỗ ngồi trong khuôn viên trường đại học. Dự án được thực hiện trong khuôn khổ môn học Công nghệ phần mềm (CNPM).

Hệ thống hướng đến việc số hóa quy trình đặt phòng, quản lý lịch sử dụng phòng, đăng ký chỗ ngồi, điểm danh và xử lý sự cố. Qua đó, hệ thống giúp giảm xung đột lịch đặt, tăng khả năng theo dõi tình trạng phòng và hỗ trợ các hoạt động giảng dạy, học tập.

### 1.1. Vấn đề cần giải quyết

- Khó theo dõi tình trạng phòng học và phòng tự học theo thời gian.
- Có thể xảy ra xung đột khi nhiều người cùng đặt một phòng hoặc chỗ ngồi.
- Việc quản lý điểm danh và thông tin sử dụng phòng cần được tập trung.
- Thông tin về sự cố và tài nguyên phòng cần được quản lý thống nhất.

### 1.2. Mục tiêu

- Xây dựng hệ thống đặt phòng và chỗ ngồi có kiểm tra xung đột.
- Hỗ trợ giảng viên quản lý việc sử dụng phòng học và điểm danh.
- Hỗ trợ sinh viên đặt phòng tự học, đặt chỗ ngồi và điểm danh.
- Cung cấp chức năng quản lý phòng, tài nguyên và phân quyền.
- Xây dựng Backend API và cơ sở dữ liệu phục vụ các chức năng của hệ thống.
- Áp dụng Git, Pull Request, kiểm thử và quy trình phát triển phần mềm theo nhóm.

## 2. Sản phẩm của dự án

Sản phẩm dự kiến bao gồm ứng dụng web Smart Campus, Backend REST API, cơ sở dữ liệu và bộ tài liệu kỹ thuật.

### 2.1. Các chức năng chính

| Đối tượng          | Chức năng                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Sinh viên          | Đăng nhập, đặt chỗ ngồi, đặt/hủy phòng tự học, điểm danh bằng QR Code và nhận thông báo.    |
| Giảng viên         | Đăng nhập, đặt phòng học lý thuyết/thực hành, quản lý điểm danh và báo cáo sự cố phòng học. |
| Quản trị viên      | Quản lý phòng, tài nguyên, tài khoản và quyền truy cập theo phạm vi được quy định.          |
| Hệ thống thông báo | Hỗ trợ gửi thông báo về thay đổi lịch, phòng và các sự kiện liên quan khi được triển khai.  |

Các chức năng trên mô tả phạm vi sản phẩm dự kiến. Chức năng nào đã hoàn thành cần được xác định theo mã nguồn và kết quả kiểm thử thực tế.

### 2.2. Công nghệ dự kiến sử dụng

| Thành phần            | Công nghệ                                               |
| --------------------- | ------------------------------------------------------- |
| Frontend              | React, TypeScript                                       |
| Backend               | Java, Spring Boot                                       |
| Database              | PostgreSQL                                              |
| API                   | REST API, OpenAPI 3.1                                   |
| Authentication        | JWT và phân quyền theo vai trò (RBAC)                   |
| Kiểm thử              | Playwright và các công cụ kiểm thử phù hợp              |
| Quản lý mã nguồn      | Git, GitHub                                             |
| Môi trường triển khai | Docker, Docker Compose và CI/CD theo phạm vi triển khai |

Phiên bản công nghệ và các công cụ cụ thể cần được đối chiếu với cấu hình cuối cùng của repository.

## 3. Thành viên và phân công công việc

Nhóm có 4 thành viên, được phân chia theo các mảng công việc chính như sau:

| Thành viên        | Mã thành viên | Vai trò                  | Công việc phụ trách                                                                    |
| ----------------- | ------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| Nguyễn Trí Nguyên | M1            | Frontend                 | Thiết kế, xây dựng giao diện và bố cục responsive; phát triển các chức năng giao diện. |
| Nguyễn Hoàng Minh | M2            | Backend                  | Thiết kế API endpoints và các logic xử lý nghiệp vụ                                    |
| Lê Trung Hiếu     | M3            | Database                 | Thiết kế, xây dựng cấu trúc cơ sở dữ liệu và phối hợp tích hợp với Backend.            |
| Nguyễn Văn Tâm    | M4            | Testing / Infrastructure | Xây dựng nền tảng Docker Compose và phụ trách kiểm thử hệ thống.                       |

**Nguyên tắc phối hợp:** Các thành viên phụ trách mảng công việc chính của mình nhưng cần phối hợp khi tích hợp Frontend, Backend, Database và Testing. Bảng phân công thể hiện trách nhiệm chính, không giới hạn các công việc hỗ trợ lẫn nhau.

## 4. Cấu trúc repository

Repository GitHub của dự án:

https://github.com/nghoangming/502045-smart-campus-room-reservation

Cấu trúc thư mục dự kiến:

```text
smart-campus/
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/
│   ├── requirements/
│   │   ├── SRS.md
│   │   └── backlog.md
│   ├── modelling/
│   │   ├── modelling.md
│   │   ├── use-case.md
│   │   ├── class-diagram.md
│   │   └── sequence-diagrams/
│   │       ├── booking.md
│   │       └── seat-booking.md
│   ├── architecture/
│   │   ├── architecture.md
│   │   └── openapi.yaml
│   ├── database/
│   │   ├── erd.md
│   │   └── rbac.md
│   └── testing/
│       ├── test-plan.md
│       ├── test-cases.md
│       └── coverage.md
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── hooks/
│       ├── layouts/
│       ├── pages/
│       ├── services/
│       ├── types/
│       ├── utils/
│       ├── router/
│       ├── App.tsx
│       └── main.tsx
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/smartcampus/
│   │   │   │   ├── config/
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── exception/
│   │   │   │   ├── repository/
│   │   │   │   ├── security/
│   │   │   │   ├── service/
│   │   │   │   └── SmartCampusBackendApplication.java
│   │   │   └── resources/
│   │   │       └── application.yml
│   │   └── test/
│   │       └── java/com/smartcampus/
│   └── pom.xml
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── tests/
│   ├── api/
│   ├── e2e/
│   ├── fixtures/
│   ├── helpers/
│   └── playwright.config.ts
│
├── infra/
│   └── docker/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── TEAM_STRUCTURE.md
```

> Cây thư mục trên là cấu trúc mục tiêu. Khi cập nhật README, cần giữ lại các đường dẫn đúng với repository thực tế; không tạo thêm file chỉ để khớp với tài liệu.

### 4.1. Giải thích các thư mục

| Đường dẫn                                | Chức năng                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `.github/workflows/`                     | Chứa cấu hình GitHub Actions để tự động kiểm tra mã nguồn.             |
| `.github/PULL_REQUEST_TEMPLATE.md`       | Mẫu mô tả thay đổi khi tạo Pull Request.                               |
| `docs/requirements/`                     | Tài liệu yêu cầu phần mềm, SRS và backlog.                             |
| `docs/modelling/`                        | Tài liệu mô hình hóa, Use Case, Class Diagram và Sequence Diagram.     |
| `docs/architecture/`                     | Tài liệu kiến trúc hệ thống và đặc tả API.                             |
| `docs/database/`                         | ERD và mô hình phân quyền RBAC.                                        |
| `docs/testing/`                          | Kế hoạch kiểm thử, test cases và báo cáo coverage.                     |
| `frontend/`                              | Mã nguồn giao diện người dùng.                                         |
| `frontend/src/components/`               | Các thành phần giao diện có thể tái sử dụng.                           |
| `frontend/src/pages/`                    | Các trang chức năng của ứng dụng.                                      |
| `frontend/src/services/`                 | Các module giao tiếp với Backend API.                                  |
| `frontend/src/router/`                   | Cấu hình điều hướng giữa các trang.                                    |
| `backend/src/main/java/com/smartcampus/` | Mã nguồn xử lý nghiệp vụ phía máy chủ.                                 |
| `backend/.../controller/`                | Tiếp nhận HTTP request và trả về response.                             |
| `backend/.../service/`                   | Xử lý nghiệp vụ và các quy tắc của hệ thống.                           |
| `backend/.../repository/`                | Truy cập và thao tác dữ liệu.                                          |
| `backend/.../entity/`                    | Các lớp mô hình dữ liệu gắn với cơ sở dữ liệu.                         |
| `backend/.../dto/`                       | Các đối tượng dữ liệu trao đổi qua API.                                |
| `backend/.../config/`                    | Cấu hình ứng dụng.                                                     |
| `backend/.../security/`                  | Cấu hình xác thực và phân quyền.                                       |
| `backend/.../exception/`                 | Xử lý ngoại lệ và lỗi API.                                             |
| `backend/src/test/`                      | Các bài kiểm thử Backend.                                              |
| `database/migrations/`                   | Các thay đổi schema được quản lý theo phiên bản.                       |
| `database/seeds/`                        | Dữ liệu ban đầu hoặc dữ liệu mẫu.                                      |
| `tests/api/`                             | Các kiểm thử API.                                                      |
| `tests/e2e/`                             | Các kiểm thử luồng sử dụng toàn hệ thống.                              |
| `tests/fixtures/`                        | Dữ liệu phục vụ kiểm thử.                                              |
| `tests/helpers/`                         | Hàm hỗ trợ kiểm thử.                                                   |
| `infra/docker/`                          | Các cấu hình hạ tầng Docker bổ sung.                                   |
| `docker-compose.yml`                     | Cấu hình chạy nhiều dịch vụ bằng Docker Compose nếu đã được thiết lập. |
| `.env.example`                           | Mẫu các biến môi trường cần cấu hình, không chứa thông tin bí mật.     |
| `TEAM_STRUCTURE.md`                      | Thông tin tổ chức nhóm và phân công thành viên.                        |

## 5. Quy trình Git cho nhóm CNPM

### 5.1. Quy ước chung

Nhóm sử dụng workflow:

**Branch riêng → Pull Request → Review → Approve → Merge vào `develop`**

- `develop` là nhánh phát triển chung và hiện là Default Branch.
- Không thành viên nào được push trực tiếp lên `develop`.
- Mỗi task sử dụng một branch riêng.
- Mọi thay đổi cần thông qua Pull Request (PR).
- Mỗi PR phải có ít nhất một thành viên khác review và approve.
- Các thành viên cần kiểm tra mã nguồn trước khi commit.
- Chỉ merge khi đã đáp ứng yêu cầu review và các điều kiện kiểm tra của repository.

### 5.2. Bước 1 – Cập nhật `develop`

Trước khi bắt đầu task, chuyển về nhánh `develop` và lấy mã nguồn mới nhất:

```bash
git checkout develop
git pull origin develop
```

### 5.3. Bước 2 – Tạo branch riêng

Tạo branch theo chức năng hoặc task đang thực hiện:

```bash
git checkout -b <task của vai trò nào, tuần nào>
```

Ví dụ:

```bash
git checkout -b backend_Week1
```

### 5.4. Bước 3 – Code và kiểm tra

Thành viên thực hiện công việc trong thư mục thuộc phạm vi phụ trách.

Ví dụ, thành viên Frontend có thể làm việc trong `frontend/`, còn thành viên Backend chủ yếu làm việc trong `backend/`.

Kiểm tra các thay đổi:

```bash
git status
```

Chạy các kiểm tra cần thiết trước khi commit, chẳng hạn kiểm tra biên dịch, lint hoặc test liên quan đến task.

### 5.5. Bước 4 – Commit code

Đưa các thay đổi vào staging:

```bash
git add .
```

Tạo commit với thông điệp mô tả rõ nội dung:

```bash
git commit -m "feat: add login page"
```

Một số ví dụ:

```text
feat: add login page
feat: add room availability endpoint
fix: prevent overlapping room bookings
test: add booking conflict tests
docs: update project README
```

Không nên sử dụng những thông điệp chung chung như `update`, `fix` hoặc `commit` nếu không thể hiện được nội dung thay đổi.

### 5.6. Bước 5 – Push branch lên GitHub

```bash
git push -u origin feature/fe-login
```

Thay `feature/fe-login` bằng tên branch thực tế đang làm việc.

### 5.7. Bước 6 – Tạo Pull Request

Trên GitHub:

1. Mở repository của nhóm.
2. Chọn **Pull requests**.
3. Chọn **New pull request**.
4. Chọn `base: develop`.
5. Chọn `compare: <branch-của-task>`.
6. Mô tả nội dung đã thực hiện và các kiểm tra đã chạy.
7. Chọn ít nhất một thành viên khác làm Reviewer.
8. Tạo Pull Request.

PR cần tập trung vào một task hoặc một nhóm thay đổi có liên quan, tránh gộp quá nhiều chức năng không liên quan.

### 5.8. Bước 7 – Review và sửa lỗi

Reviewer kiểm tra:

- Mã nguồn có đáp ứng yêu cầu của task không.
- Có lỗi logic hoặc ảnh hưởng đến chức năng hiện có không.
- Cấu trúc mã nguồn có phù hợp với quy ước nhóm không.
- Các kiểm tra cần thiết đã chạy thành công chưa.

Nếu có lỗi, người tạo PR sửa trên chính branch đó:

```bash
git add .
git commit -m "fix: address review feedback"
git push
```

PR hiện tại sẽ được cập nhật. Reviewer kiểm tra lại trước khi approve.

### 5.9. Bước 8 – Merge vào `develop`

Sau khi có ít nhất một approval và đáp ứng các điều kiện của repository:

1. Kiểm tra lại trạng thái PR.
2. Chọn phương thức merge được nhóm thống nhất.
3. Merge PR vào `develop`.
4. Xóa branch của task sau khi merge nếu không còn cần thiết.

Không xóa branch khi PR chưa được merge hoặc vẫn cần tiếp tục xử lý.

### 5.10. Bước 9 – Bắt đầu task tiếp theo

Sau khi hoàn tất task, cập nhật `develop` và tạo branch mới:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<task-moi>
```

Không tiếp tục phát triển task mới trên branch cũ đã hoàn tất.

### 5.11. Ví dụ quy trình cho một task

| Bước | Thực hiện              | Kết quả                          |
| ---- | ---------------------- | -------------------------------- |
| 1    | Cập nhật `develop`     | Có mã nguồn mới nhất             |
| 2    | Tạo `feature/fe-login` | Có branch riêng cho task         |
| 3    | Code và test           | Hoàn thành phần đăng nhập        |
| 4    | Commit và push         | Branch được cập nhật trên GitHub |
| 5    | Tạo PR vào `develop`   | Thành viên khác có thể review    |
| 6    | Review và approve      | Thay đổi đạt yêu cầu             |
| 7    | Merge PR               | Code được tích hợp vào `develop` |

**Lưu ý:** Mỗi task sử dụng một branch riêng. Không tạo một branch cá nhân chung rồi đưa nhiều chức năng không liên quan vào cùng branch.

## 6. Hướng dẫn cài đặt và khởi chạy hệ thống

Phần này hướng dẫn người dùng chuẩn bị môi trường, tải mã nguồn, cấu hình cơ sở dữ liệu và khởi chạy Smart Campus trên máy tính cá nhân.

Có hai nhóm đối tượng chính:

- **Giảng viên và người dùng muốn trải nghiệm:** Thực hiện cài đặt theo hướng dẫn để khởi chạy hệ thống và sử dụng các chức năng đã được triển khai.
- **Người muốn sử dụng hoặc phát triển mã nguồn:** Tải repository, cài đặt các công cụ cần thiết và chạy riêng từng thành phần để kiểm tra hoặc phát triển thêm chức năng.

### 6.1. Yêu cầu trước khi cài đặt

Cài đặt các công cụ sau trước khi bắt đầu:

| Công cụ                             | Mục đích                        | Kiểm tra cài đặt                                 |
| ----------------------------------- | ------------------------------- | ------------------------------------------------ |
| Git                                 | Tải mã nguồn từ GitHub          | `git --version`                                  |
| JDK                                 | Biên dịch và chạy Backend Java  | `java -version`                                  |
| Maven Wrapper                       | Quản lý quá trình build Backend | Có file `mvnw.cmd` trong `backend/` trên Windows |
| PostgreSQL                          | Lưu trữ dữ liệu hệ thống        | Kiểm tra dịch vụ PostgreSQL đang hoạt động       |
| Node.js và npm                      | Cài đặt thư viện, chạy Frontend | `node -v` và `npm -v`                            |
| Docker Desktop (nếu sử dụng Docker) | Chạy các dịch vụ bằng container | `docker --version`                               |

Sử dụng phiên bản tương thích với cấu hình dự án. Tham khảo các file cấu hình trong repository để xác định phiên bản JDK, Node.js và các công cụ cần thiết.

### 6.2. Tải mã nguồn

Mở Terminal hoặc PowerShell và chạy:

```bash
git clone https://github.com/nghoangming/502045-smart-campus-room-reservation.git
cd 502045-smart-campus-room-reservation
```

Nếu đã tải mã nguồn trước đó, mở Terminal tại thư mục repository hiện có.

Để lấy phiên bản mới nhất của nhánh phát triển chung:

```bash
git checkout develop
git pull origin develop
```

Người chỉ muốn trải nghiệm hệ thống có thể sử dụng phiên bản ổn định mà nhóm cung cấp. Người muốn phát triển mã nguồn nên tạo branch riêng theo quy trình Git của nhóm.

### 6.3. Cấu hình biến môi trường

Kiểm tra file `.env.example` và các file cấu hình của Frontend, Backend để xác định những thông tin cần thiết.

Nếu dự án sử dụng file `.env.example`, tạo file `.env` theo hướng dẫn của nhóm và điền các giá trị phù hợp với môi trường cục bộ.

Các thông tin có thể cần cấu hình gồm:

- Địa chỉ và cổng PostgreSQL.
- Tên database, username và password.
- Cổng chạy Backend.
- Địa chỉ API mà Frontend sử dụng.
- Các khóa bảo mật cần thiết cho môi trường phát triển.

Không đưa mật khẩu, JWT secret hoặc thông tin nhạy cảm vào GitHub. Không tự tạo tên biến môi trường nếu chúng chưa được khai báo hoặc hỗ trợ trong mã nguồn.

### 6.4. Khởi tạo cơ sở dữ liệu

Smart Campus sử dụng PostgreSQL để lưu trữ dữ liệu.

**Bước 1:** Khởi động dịch vụ PostgreSQL hoặc khởi chạy dịch vụ tương ứng bằng Docker Compose nếu cấu hình này đã được hoàn thiện.

**Bước 2:** Tạo database theo tên được khai báo trong cấu hình Backend.

**Bước 3:** Khởi tạo cấu trúc bảng bằng migration hoặc script database chính thức của dự án.

**Bước 4:** Nếu cần dữ liệu demo, chạy các script seed do nhóm cung cấp.

**Bước 5:** Kiểm tra kết nối database trước khi khởi chạy toàn bộ ứng dụng.

Không nên tự tạo bảng hoặc nhập dữ liệu mẫu theo phỏng đoán vì có thể không khớp với ERD và các entity trong mã nguồn.

### 6.5. Khởi chạy Backend

Backend chịu trách nhiệm xử lý nghiệp vụ, xác thực, phân quyền và cung cấp REST API cho Frontend.

**Bước 1:** Mở một Terminal mới và chuyển vào thư mục Backend:

```powershell
cd backend
```

**Bước 2:** Khởi chạy ứng dụng bằng Maven Wrapper trên Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Trên Linux hoặc macOS:

```bash
./mvnw spring-boot:run
```

**Bước 3:** Chờ ứng dụng khởi động hoàn tất và kiểm tra log trong Terminal.

Nếu ứng dụng sử dụng cổng mặc định `8080`, có thể kiểm tra endpoint health tại:

http://localhost:8080/api/v1/health

Nếu nhận được phản hồi xác nhận Backend đang hoạt động, endpoint kiểm tra sức khỏe đã chạy thành công. Tuy nhiên, vẫn cần kiểm tra kết nối PostgreSQL và các API nghiệp vụ trước khi sử dụng đầy đủ hệ thống.

Giữ Terminal này mở trong thời gian sử dụng Backend.

### 6.6. Khởi chạy Frontend

Frontend cung cấp giao diện để người dùng thao tác với hệ thống.

**Bước 1:** Mở một Terminal khác và chuyển vào thư mục Frontend:

```bash
cd frontend
```

**Bước 2:** Cài đặt các thư viện cần thiết:

```bash
npm install
```

**Bước 3:** Khởi chạy ứng dụng:

```bash
npm run dev
```

Các lệnh trên áp dụng khi dự án đã sử dụng Node.js, npm và có cấu hình script tương ứng trong `frontend/package.json`.

**Bước 4:** Mở địa chỉ được hiển thị trong Terminal bằng trình duyệt web.

Nếu giao diện không lấy được dữ liệu, kiểm tra địa chỉ API được cấu hình ở Frontend, trạng thái Backend và cấu hình CORS.

Giữ Terminal Frontend mở trong thời gian sử dụng ứng dụng.

### 6.7. Truy cập và sử dụng hệ thống

Sau khi các thành phần đã được khởi chạy:

1. Mở trình duyệt và truy cập địa chỉ Frontend.
2. Đăng nhập bằng tài khoản demo do nhóm cung cấp, nếu chức năng đăng nhập đã hoàn thiện.
3. Truy cập các chức năng tương ứng với vai trò tài khoản.
4. Thử các nghiệp vụ đã được triển khai, chẳng hạn tra cứu phòng, đặt phòng hoặc xem lịch.
5. Đăng xuất sau khi hoàn tất.

Tài khoản demo, mật khẩu và các chức năng có thể sử dụng cần được nhóm công bố riêng sau khi kiểm thử. Không sử dụng tài khoản cá nhân của thành viên nhóm để trình diễn công khai.

### 6.8. Khởi chạy bằng Docker Compose

Nếu repository đã có cấu hình Docker Compose đầy đủ, người dùng có thể sử dụng phương án này để giảm số bước cài đặt thủ công.

Tại thư mục gốc repository, chạy:

```bash
docker compose up --build
```

Để dừng các dịch vụ đang chạy, nhấn `Ctrl + C`. Có thể dùng lệnh sau để dừng các container do Compose quản lý:

```bash
docker compose down
```

Lưu ý: Các lệnh trên chỉ sử dụng được khi `docker-compose.yml` đã khai báo đầy đủ những dịch vụ cần thiết, thông tin môi trường và cách khởi chạy. Không giả định rằng toàn bộ Frontend, Backend và PostgreSQL đã được tích hợp Docker nếu cấu hình thực tế chưa hỗ trợ.

### 6.9. Xử lý sự cố thường gặp

| Sự cố                               | Cách xử lý                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Không tải được mã nguồn             | Kiểm tra kết nối Internet, URL repository và quyền truy cập.                             |
| Không chạy được Backend             | Kiểm tra JDK, Maven Wrapper, cấu hình ứng dụng và log lỗi.                               |
| Backend không kết nối được database | Kiểm tra PostgreSQL, thông tin kết nối, tài khoản và trạng thái migration.               |
| Không mở được giao diện             | Kiểm tra Frontend đã khởi chạy và truy cập đúng địa chỉ được hiển thị trong Terminal.    |
| Frontend không lấy được dữ liệu     | Kiểm tra Backend, URL API, CORS và thông báo lỗi trong trình duyệt.                      |
| Không đăng nhập được                | Kiểm tra tài khoản demo, dữ liệu người dùng và trạng thái triển khai chức năng xác thực. |
| Docker không khởi chạy              | Kiểm tra Docker Desktop, file Compose và các cổng đang được sử dụng.                     |

Nếu vẫn gặp lỗi, hãy ghi lại thông báo trong Terminal hoặc trình duyệt để nhóm phát triển kiểm tra.

### 6.10. Lưu ý khi sử dụng mã nguồn

- Kiểm tra README và cấu hình của từng thành phần trước khi chạy.
- Sử dụng dữ liệu thử nghiệm trong môi trường phát triển.
- Không commit file chứa thông tin đăng nhập hoặc secret.
- Không sửa trực tiếp nhánh `develop`; tuân thủ quy trình branch và Pull Request của nhóm.
- Các chức năng chưa được triển khai hoặc kiểm thử hoàn chỉnh không nên được sử dụng cho nghiệp vụ thực tế.

**Lưu ý về trạng thái triển khai:** Hướng dẫn này cần được cập nhật theo cấu hình cuối cùng của repository. Backend hiện đã có endpoint kiểm tra hoạt động, nhưng việc kết nối PostgreSQL, tích hợp Frontend và triển khai đầy đủ các chức năng cần được xác nhận trước khi công bố đây là hướng dẫn chạy hoàn chỉnh.

## 7. Kiểm thử và tích hợp

Nhóm tổ chức kiểm thử theo từng phần và kiểm thử tích hợp:

- **Frontend:** Kiểm tra giao diện, điều hướng, biểu mẫu và trạng thái hiển thị.
- **Backend:** Kiểm tra API, xác thực, phân quyền, xử lý lỗi và nghiệp vụ.
- **Database:** Kiểm tra tính toàn vẹn dữ liệu, quan hệ và migration.
- **API testing:** Kiểm tra request, response và các trường hợp lỗi.
- **End-to-end testing:** Kiểm tra các luồng sử dụng hoàn chỉnh khi hệ thống tích hợp đã sẵn sàng.
- **CI:** Tự động chạy các bước kiểm tra được cấu hình trong GitHub Actions.

Với nghiệp vụ đặt phòng, cần kiểm tra cả trường hợp hai yêu cầu có thời gian chồng lấn và trường hợp nhiều người gửi yêu cầu đồng thời.

## 8. Tài liệu dự án

Các tài liệu kỹ thuật được tổ chức trong thư mục `docs/`:

| Tài liệu                            | Nội dung                       |
| ----------------------------------- | ------------------------------ |
| `docs/requirements/SRS.md`          | Đặc tả yêu cầu phần mềm        |
| `docs/requirements/backlog.md`      | Danh sách công việc và backlog |
| `docs/modelling/modelling.md`       | Tổng quan mô hình hóa          |
| `docs/modelling/use-case.md`        | Use Case của hệ thống          |
| `docs/modelling/class-diagram.md`   | Mô hình lớp                    |
| `docs/modelling/sequence-diagrams/` | Các Sequence Diagram           |
| `docs/architecture/architecture.md` | Kiến trúc hệ thống             |
| `docs/architecture/openapi.yaml`    | Đặc tả API                     |
| `docs/database/erd.md`              | Sơ đồ cơ sở dữ liệu            |
| `docs/database/rbac.md`             | Mô hình phân quyền             |
| `docs/testing/test-plan.md`         | Kế hoạch kiểm thử              |
| `docs/testing/test-cases.md`        | Các trường hợp kiểm thử        |
| `docs/testing/coverage.md`          | Báo cáo độ bao phủ kiểm thử    |

Chỉ bổ sung các đường dẫn tương ứng với những file thực sự có trong repository.

## 9. Nguyên tắc phát triển

1. Đọc yêu cầu và xác định rõ phạm vi task trước khi code.
2. Tạo branch riêng cho mỗi task.
3. Không push trực tiếp vào `develop`.
4. Kiểm tra mã nguồn trước khi tạo Pull Request.
5. Mỗi PR cần có ít nhất một thành viên khác review và approve.
6. Cập nhật tài liệu khi thay đổi ảnh hưởng đến API, kiến trúc, database hoặc cách chạy hệ thống.
7. Không commit mật khẩu, secret hoặc dữ liệu nhạy cảm.
8. Phối hợp với các thành viên liên quan trước khi thay đổi giao diện API hoặc schema database.
9. Kiểm tra lại hệ thống sau khi tích hợp các phần.
10. Chỉ mô tả một chức năng là hoàn thành khi đã được triển khai và kiểm tra phù hợp.

## 10. Thông tin dự án

- **Tên dự án:** Smart Campus
- **Môn học:** Công nghệ phần mềm (CNPM)
- **Repository:** https://github.com/nghoangming/502045-smart-campus-room-reservation
- **Nhánh phát triển chung:** `develop`
- **Số thành viên:** 4
- **Phạm vi:** Phân tích yêu cầu, mô hình hóa, phát triển Frontend/Backend, thiết kế Database, kiểm thử và tích hợp hệ thống.
