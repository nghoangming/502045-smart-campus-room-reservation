-- Disposable data for the PostgreSQL service in GitHub Actions only.
-- Apply after all migrations and the repository's demo-user seed.
INSERT INTO users (user_code, full_name, email, password_hash, faculty, faculty_code, email_verified)
SELECT 'student2', 'CI Student 2', 'student2@smartcampus.test', password_hash, faculty, faculty_code, TRUE
FROM users WHERE email = 'student@smartcampus.test';

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id FROM users u CROSS JOIN roles r
WHERE u.email = 'student2@smartcampus.test' AND r.role_name = 'STUDENT';

INSERT INTO rooms (room_code, name, location, status, type) VALUES
    ('A100', 'CI Lab', 'CI', 'ACTIVE', 'LAB'),
    ('B100', 'CI Classroom', 'CI', 'ACTIVE', 'THEORY'),
    ('C100', 'CI Study Room', 'CI', 'ACTIVE', 'SELF_STUDY');

INSERT INTO seats (room_id, seat_number, status)
SELECT r.room_id, n, 'AVAILABLE'
FROM rooms r CROSS JOIN generate_series(1, 20) AS n
WHERE r.room_code IN ('A100', 'B100', 'C100');
