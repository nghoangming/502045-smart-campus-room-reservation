BEGIN;
SET LOCAL lock_timeout = '10s';

-- Fail atomically on conflicting legacy data; never silently delete real bookings.
-- Applies to every booking owner (including teachers across different rooms).
ALTER TABLE bookings ADD CONSTRAINT ex_bookings_owner_active_time
 EXCLUDE USING gist (user_id WITH =, tstzrange(start_time,end_time,'[)') WITH &&)
 WHERE (status IN ('PENDING','CONFIRMED'));

-- Snapshot the session interval for an exclusion constraint that also arbitrates races.
ALTER TABLE seat_reservations ADD COLUMN start_time TIMESTAMPTZ,
 ADD COLUMN end_time TIMESTAMPTZ;
UPDATE seat_reservations sr SET start_time=cs.start_time,end_time=cs.end_time
 FROM class_sessions cs WHERE cs.class_session_id=sr.class_session_id;
UPDATE seat_reservations SET status='CANCELLED'
 WHERE status='PENDING' AND hold_expires_at<=clock_timestamp();
UPDATE seat_reservations sr SET status='CANCELLED'
 FROM class_sessions cs JOIN bookings b USING(booking_id)
 WHERE sr.class_session_id=cs.class_session_id AND b.status IN ('CANCELLED','REJECTED')
 AND sr.status IN ('PENDING','CONFIRMED');
UPDATE checkin_challenges ch SET revoked_at=clock_timestamp()
 FROM bookings b WHERE b.booking_id=ch.booking_id
 AND b.status IN ('CANCELLED','REJECTED') AND ch.revoked_at IS NULL;
ALTER TABLE seat_reservations ALTER COLUMN start_time SET NOT NULL,
 ALTER COLUMN end_time SET NOT NULL,
 ADD CONSTRAINT ex_student_active_session_time EXCLUDE USING gist
 (user_id WITH =, tstzrange(start_time,end_time,'[)') WITH &&)
 WHERE (status IN ('PENDING','CONFIRMED'));

CREATE FUNCTION guard_seat_schedule() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 SELECT cs.start_time,cs.end_time INTO STRICT NEW.start_time,NEW.end_time
 FROM class_sessions cs WHERE cs.class_session_id=NEW.class_session_id;
 IF NEW.status IN ('PENDING','CONFIRMED') THEN
   -- An expired hold in a DIFFERENT session must not block the student's new choice.
   UPDATE seat_reservations SET status='CANCELLED'
    WHERE user_id=NEW.user_id AND status='PENDING' AND hold_expires_at<=clock_timestamp()
      AND seat_reservation_id<>NEW.seat_reservation_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_seat_schedule BEFORE INSERT OR UPDATE ON seat_reservations
 FOR EACH ROW EXECUTE FUNCTION guard_seat_schedule();

CREATE FUNCTION guard_booking_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IS DISTINCT FROM NEW.status AND NOT (
   (OLD.status='PENDING' AND NEW.status IN ('CONFIRMED','REJECTED','CANCELLED')) OR
   (OLD.status='CONFIRMED' AND NEW.status='CANCELLED')
 ) THEN
   RAISE EXCEPTION 'Invalid booking status transition: % -> %',OLD.status,NEW.status USING ERRCODE='23514';
 END IF;
 IF (NEW.user_id,NEW.room_id,NEW.start_time,NEW.end_time) IS DISTINCT FROM
    (OLD.user_id,OLD.room_id,OLD.start_time,OLD.end_time) AND EXISTS (
      SELECT 1 FROM class_sessions WHERE booking_id=OLD.booking_id) THEN
   RAISE EXCEPTION 'Cancel and recreate a scheduled booking to change owner, room or time' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_booking_lifecycle BEFORE UPDATE ON bookings
 FOR EACH ROW EXECUTE FUNCTION guard_booking_lifecycle();

-- Protect copied seat intervals even against direct edits to a session with history.
CREATE FUNCTION guard_session_schedule() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.booking_id,NEW.room_id,NEW.start_time,NEW.end_time) IS DISTINCT FROM
    (OLD.booking_id,OLD.room_id,OLD.start_time,OLD.end_time) AND EXISTS (
      SELECT 1 FROM seat_reservations WHERE class_session_id=OLD.class_session_id) THEN
   RAISE EXCEPTION 'Session with seat history cannot be rescheduled; cancel and recreate' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_session_schedule BEFORE UPDATE ON class_sessions
 FOR EACH ROW EXECUTE FUNCTION guard_session_schedule();

CREATE FUNCTION sync_cancelled_booking() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE seat_reservations sr SET status='CANCELLED'
 FROM class_sessions cs WHERE cs.booking_id=NEW.booking_id
   AND sr.class_session_id=cs.class_session_id AND sr.status IN ('PENDING','CONFIRMED');
 UPDATE checkin_challenges SET revoked_at=clock_timestamp()
 WHERE booking_id=NEW.booking_id AND revoked_at IS NULL;
 -- Attendance/check-in history is retained, not erased by cancelling a booking.
 RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_cancelled_booking AFTER UPDATE OF status ON bookings
 FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('CANCELLED','REJECTED'))
 EXECUTE FUNCTION sync_cancelled_booking();

ALTER TABLE bookings ADD COLUMN reviewed_by BIGINT REFERENCES users(user_id),
 ADD COLUMN reviewed_at TIMESTAMPTZ, ADD COLUMN review_note TEXT,
 ADD COLUMN cancelled_by BIGINT REFERENCES users(user_id),
 ADD COLUMN cancelled_at TIMESTAMPTZ, ADD COLUMN cancellation_reason TEXT;

-- IDs come only from the authenticated backend, as with the existing absence functions.
CREATE FUNCTION review_booking(p_booking bigint,p_admin bigint,p_approve boolean,p_note text DEFAULT NULL)
RETURNS bookings LANGUAGE plpgsql AS $$
DECLARE v_result bookings;
BEGIN
 IF p_admin IS NULL OR NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
   WHERE ur.user_id=p_admin AND r.role_name='ADMIN') THEN
   RAISE EXCEPTION 'Admin required to review bookings' USING ERRCODE='42501'; END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Approval decision required' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM class_sessions WHERE booking_id=p_booking FOR UPDATE;
 SELECT * INTO STRICT v_result FROM bookings WHERE booking_id=p_booking FOR UPDATE;
 IF v_result.status<>'PENDING' THEN
   RAISE EXCEPTION 'Only pending bookings may be reviewed' USING ERRCODE='23514'; END IF;
 UPDATE bookings SET status=CASE WHEN p_approve THEN 'CONFIRMED' ELSE 'REJECTED' END,
   reviewed_by=p_admin,reviewed_at=clock_timestamp(),review_note=p_note
 WHERE booking_id=p_booking RETURNING * INTO v_result;
 RETURN v_result;
END $$;

CREATE FUNCTION cancel_booking(p_booking bigint,p_actor bigint,p_reason text DEFAULT NULL)
RETURNS bookings LANGUAGE plpgsql AS $$
DECLARE v_result bookings;
BEGIN
 PERFORM 1 FROM class_sessions WHERE booking_id=p_booking FOR UPDATE;
 SELECT * INTO STRICT v_result FROM bookings WHERE booking_id=p_booking FOR UPDATE;
 IF p_actor IS NULL OR (p_actor<>v_result.user_id AND NOT EXISTS (
   SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
   WHERE ur.user_id=p_actor AND r.role_name='ADMIN')) THEN
   RAISE EXCEPTION 'Only the booking owner or admin may cancel' USING ERRCODE='42501'; END IF;
 IF v_result.status='CANCELLED' THEN RETURN v_result; END IF;
 IF v_result.status NOT IN ('PENDING','CONFIRMED') THEN
   RAISE EXCEPTION 'Booking cannot be cancelled in its current status' USING ERRCODE='23514'; END IF;
 UPDATE bookings SET status='CANCELLED',cancelled_by=p_actor,
   cancelled_at=clock_timestamp(),cancellation_reason=p_reason
 WHERE booking_id=p_booking RETURNING * INTO v_result;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION review_booking(bigint,bigint,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_booking(bigint,bigint,text) FROM PUBLIC;

CREATE OR REPLACE VIEW class_session_calendar AS
SELECT cs.class_session_id,cs.booking_id,cs.course_code,cs.title,cs.room_id,
 cs.start_time,cs.end_time,cs.session_kind,
 CASE WHEN EXISTS (SELECT 1 FROM absence_requests ar WHERE ar.class_session_id=cs.class_session_id
   AND ar.request_type='TEACHER' AND ar.status='APPROVED') THEN 'ABSENT'
 WHEN b.status IN ('CANCELLED','REJECTED','PENDING') THEN b.status::text
 WHEN cs.session_kind='MAKEUP' THEN 'MAKEUP' ELSE 'SCHEDULED' END AS calendar_status
FROM class_sessions cs JOIN bookings b USING(booking_id);

CREATE OR REPLACE VIEW student_faculty_calendar AS
SELECT cal.*,cs.faculty_code FROM class_session_calendar cal
JOIN bookings b ON b.booking_id=cal.booking_id
JOIN class_sessions cs ON cs.class_session_id=cal.class_session_id
JOIN users student ON student.user_id=app_current_user_id()
WHERE app_current_role()='STUDENT'
 AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
   WHERE ur.user_id=student.user_id AND r.role_name='STUDENT')
 AND student.faculty_code=cs.faculty_code AND b.status<>'PENDING';

CREATE OR REPLACE VIEW class_seat_availability AS
SELECT cs.class_session_id,s.seat_id,s.room_id,s.seat_number,s.status AS physical_status,
 CASE WHEN b.status<>'CONFIRMED' OR r.status<>'ACTIVE' THEN 'UNAVAILABLE'
 WHEN sr.status='CONFIRMED' THEN 'RESERVED'
 WHEN sr.status='PENDING' THEN 'PENDING' ELSE 'AVAILABLE' END AS reservation_status,
 sr.hold_expires_at
FROM class_sessions cs JOIN bookings b USING(booking_id)
JOIN rooms r ON r.room_id=cs.room_id JOIN seats s ON s.room_id=cs.room_id
LEFT JOIN seat_reservations sr ON sr.class_session_id=cs.class_session_id AND sr.seat_id=s.seat_id
 AND (sr.status='CONFIRMED' OR (sr.status='PENDING' AND sr.hold_expires_at>clock_timestamp()));
COMMIT;
