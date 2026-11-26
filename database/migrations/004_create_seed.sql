-- Demo data: run manually after 001, 002 and 003 on the intended database.
-- BCrypt demo credentials: admin/Admin@123, teacher/Teacher@123, student/Student@123.
INSERT INTO users (user_code, full_name, email, password_hash) VALUES
    ('admin', 'Campus Administrator', 'admin@smartcampus.test', '$2a$10$48PFqODW9Q4032olxkmfF.b8VMeBb0n4ZiWHGItxChltfttwo613C'),
    ('teacher', 'Demo Teacher', 'teacher@smartcampus.test', '$2a$10$CfBEHolwhpQ54ZVKmhX7a.iT8t9C..orIxQi8NIZjYUGZYnFvdXdu'),
    ('student', 'Demo Student', 'student@smartcampus.test', '$2a$10$ZKEKKxUF533j3X8PuWKr5.QmOztpKGlJjnHlpuNQD8ktdgeNNi3rW')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT users.user_id, roles.role_id
FROM (VALUES ('admin', 'ADMIN'), ('teacher', 'TEACHER'), ('student', 'STUDENT')) AS demo(user_code, role_name)
JOIN users ON users.user_code = demo.user_code
JOIN roles ON roles.role_name = demo.role_name
ON CONFLICT DO NOTHING;