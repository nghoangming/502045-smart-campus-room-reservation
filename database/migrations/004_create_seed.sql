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

INSERT INTO rooms (room_code, name, location, status) VALUES
    ('A101', 'Lecture Room A101', 'Building A - Floor 1', 'ACTIVE'),
    ('A102', 'Lecture Room A102', 'Building A - Floor 1', 'ACTIVE'),
    ('B201', 'Computer Lab B201', 'Building B - Floor 2', 'ACTIVE'),
    ('B202', 'Computer Lab B202', 'Building B - Floor 2', 'MAINTENANCE'),
    ('C301', 'Study Room C301', 'Building C - Floor 3', 'ACTIVE'),
    ('C302', 'Study Room C302', 'Building C - Floor 3', 'ACTIVE')
ON CONFLICT (room_code) DO NOTHING;

-- Fixed demonstration date: select 2026-10-16 in the UI to see these bookings.
-- Resolve identity IDs by natural keys instead of assuming IDs start at 1.
INSERT INTO bookings (user_id, room_id, start_time, end_time, status)
SELECT users.user_id, rooms.room_id, demo.start_time, demo.end_time, demo.status
FROM (VALUES
    ('teacher', 'A101', TIMESTAMPTZ '2026-10-16 08:00:00+07', TIMESTAMPTZ '2026-10-16 10:00:00+07', 'CONFIRMED'),
    ('teacher', 'A102', TIMESTAMPTZ '2026-10-16 09:00:00+07', TIMESTAMPTZ '2026-10-16 11:00:00+07', 'CONFIRMED'),
    ('teacher', 'B201', TIMESTAMPTZ '2026-10-16 13:00:00+07', TIMESTAMPTZ '2026-10-16 15:00:00+07', 'CONFIRMED'),
    ('student', 'C301', TIMESTAMPTZ '2026-10-16 08:00:00+07', TIMESTAMPTZ '2026-10-16 10:00:00+07', 'CANCELLED')
) AS demo(user_code, room_code, start_time, end_time, status)
JOIN users ON users.user_code = demo.user_code
JOIN rooms ON rooms.room_code = demo.room_code
WHERE NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.user_id = users.user_id AND bookings.room_id = rooms.room_id
      AND bookings.start_time = demo.start_time AND bookings.end_time = demo.end_time
      AND bookings.status = demo.status
);
