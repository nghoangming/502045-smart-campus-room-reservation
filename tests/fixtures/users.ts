/**
 * Tài khoản dùng cho test.
 * - admin (UI): tài khoản demo cứng trong frontend hiện tại (Login.tsx).
 * - apiUsers: tài khoản trong DB/seed của M3 — đổi qua biến môi trường khi seed xong.
 */
export const users = {
  admin: { username: 'admin', password: 'admin123' },
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
