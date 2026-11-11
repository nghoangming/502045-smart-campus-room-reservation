BEGIN;

ALTER TABLE student_intake ADD COLUMN entry_year SMALLINT;

-- Existing submissions had no entry year; preserve their previous code-year behavior.
UPDATE student_intake
SET entry_year = EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::SMALLINT;

ALTER TABLE student_intake
    ALTER COLUMN entry_year SET NOT NULL,
    ADD CONSTRAINT chk_student_intake_entry_year CHECK (entry_year BETWEEN 2000 AND 2100);

-- Keep the A-P codes from 017: they are also used when generating student codes.
INSERT INTO faculties(faculty_code, faculty_name) VALUES
 ('A','Công nghệ thông tin'), ('K','Quản trị kinh doanh'), ('I','Luật')
ON CONFLICT (faculty_code) DO UPDATE SET faculty_name=EXCLUDED.faculty_name;

ALTER TABLE users ADD COLUMN faculty_code CHAR(1) REFERENCES faculties(faculty_code);
CREATE INDEX idx_users_faculty_code ON users(faculty_code);
-- Only map known names/codes; never guess a faculty for existing real accounts.
UPDATE users u SET faculty_code=f.faculty_code FROM faculties f
 WHERE lower(btrim(u.faculty)) IN (lower(f.faculty_name),lower(f.faculty_code::text));
UPDATE users SET faculty_code=CASE upper(btrim(faculty))
 WHEN 'CNTT' THEN 'A' WHEN 'QTKD' THEN 'K' WHEN 'LUẬT' THEN 'I' END
 WHERE faculty_code IS NULL AND upper(btrim(faculty)) IN ('CNTT','QTKD','LUẬT');
-- The demo teacher and student belong to CNTT. No year restriction is applied.
UPDATE users SET faculty_code='A'
 WHERE faculty_code IS NULL AND user_code IN ('teacher','student')
 AND email IN ('teacher@smartcampus.test','student@smartcampus.test');

-- Snapshot the teaching faculty so later profile changes do not move old timetables.
ALTER TABLE class_sessions ADD COLUMN faculty_code CHAR(1) REFERENCES faculties(faculty_code);
UPDATE class_sessions cs SET faculty_code=u.faculty_code
FROM bookings b JOIN users u ON u.user_id=b.user_id WHERE cs.booking_id=b.booking_id;
CREATE INDEX idx_class_sessions_faculty_time ON class_sessions(faculty_code,start_time);

CREATE FUNCTION guard_class_session_faculty() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_faculty char(1);
BEGIN
 SELECT u.faculty_code INTO v_faculty FROM bookings b JOIN users u ON u.user_id=b.user_id
 WHERE b.booking_id=NEW.booking_id AND EXISTS (
   SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
   WHERE ur.user_id=u.user_id AND r.role_name='TEACHER');
 IF v_faculty IS NULL THEN
   RAISE EXCEPTION 'Class session requires a teacher with an assigned faculty' USING ERRCODE='23514';
 END IF;
 IF TG_OP='INSERT' THEN
   NEW.faculty_code:=v_faculty;
 ELSIF NEW.booking_id IS DISTINCT FROM OLD.booking_id THEN
   NEW.faculty_code:=v_faculty;
 ELSIF NEW.faculty_code IS DISTINCT FROM OLD.faculty_code THEN
   RAISE EXCEPTION 'Session faculty is assigned automatically and cannot be edited' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_class_session_faculty BEFORE INSERT OR UPDATE OF booking_id,faculty_code ON class_sessions
 FOR EACH ROW EXECUTE FUNCTION guard_class_session_faculty();

-- Additional guard also covers direct INSERT/UPDATE, not just the hold function.
CREATE FUNCTION guard_seat_faculty() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status IN ('PENDING','CONFIRMED') AND NOT EXISTS (
   SELECT 1 FROM class_sessions cs JOIN bookings b USING(booking_id)
   JOIN users student ON student.user_id=NEW.user_id
   JOIN user_roles ur ON ur.user_id=student.user_id JOIN roles r USING(role_id)
   WHERE cs.class_session_id=NEW.class_session_id AND r.role_name='STUDENT'
     AND cs.faculty_code IS NOT NULL AND student.faculty_code=cs.faculty_code
 ) THEN
   RAISE EXCEPTION 'Student must belong to the teaching faculty' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_seat_faculty BEFORE INSERT OR UPDATE OF status,class_session_id,user_id
 ON seat_reservations FOR EACH ROW EXECUTE FUNCTION guard_seat_faculty();

-- Use this view for student timetables, not the unfiltered room calendar.
-- Context must be set transaction-locally by the trusted caller.
CREATE VIEW student_faculty_calendar AS
SELECT cal.*, cs.faculty_code
FROM class_session_calendar cal
JOIN bookings b ON b.booking_id=cal.booking_id
JOIN class_sessions cs ON cs.class_session_id=cal.class_session_id
JOIN users student ON student.user_id=app_current_user_id()
WHERE app_current_role()='STUDENT'
 AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
   WHERE ur.user_id=student.user_id AND r.role_name='STUDENT')
 AND student.faculty_code=cs.faculty_code
 AND (b.status='CONFIRMED' OR cal.calendar_status='ABSENT');
COMMENT ON VIEW student_faculty_calendar IS
 'Faculty-scoped student timetable, all entry years; faculty assigned automatically when the session is created. Base tables remain trusted-backend only.';
COMMENT ON COLUMN users.faculty_code IS
 'Canonical faculty FK. Required for teaching sessions and student seat registration. faculty is legacy display text.';

COMMIT;
