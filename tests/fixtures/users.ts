/**
 * Tài khoản dùng cho test.
 * - admin (UI) và apiUsers: tài khoản BCrypt trong database/seeds/R_dev_seed.sql.
 * - Backend cần chạy profile dev; API credentials có thể đổi qua biến môi trường.
 */
export const users = {
  admin: { username: 'admin', password: 'Admin@123' },
  invalid: { username: 'khong-ton-tai', password: 'sai-mat-khau' },
};

export const apiUsers = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? 'admin@smartcampus.test',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin@123',
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL ?? 'student@smartcampus.test',
    password: process.env.TEST_STUDENT_PASSWORD ?? 'Student@123',
  },
};
