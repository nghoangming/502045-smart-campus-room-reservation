BEGIN;
SET LOCAL lock_timeout = '10s';

-- A finished class keeps its seat and attendance history. Student seat actions stop
-- at the class session end time; administrative absence workflows remain possible.
CREATE OR REPLACE FUNCTION guard_seat_registration() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_status text; v_end_time timestamptz;
BEGIN
 IF NEW.status IN ('PENDING','CONFIRMED') THEN
   SELECT b.status,cs.end_time INTO v_status,v_end_time
   FROM class_sessions cs JOIN bookings b USING(booking_id)
   WHERE cs.class_session_id=NEW.class_session_id FOR UPDATE OF b;
   IF NOT FOUND THEN
     RAISE EXCEPTION 'Class session not found' USING ERRCODE='23503';
   END IF;
   IF v_status <> 'CONFIRMED' THEN
     RAISE EXCEPTION 'Class booking must be approved before seat registration' USING ERRCODE='23514';
   END IF;
   IF v_end_time <= clock_timestamp() THEN
     RAISE EXCEPTION 'Class session has ended; seat registration is closed' USING ERRCODE='23514';
   END IF;
   IF NEW.status='PENDING' AND NEW.hold_expires_at IS NULL THEN
     NEW.hold_expires_at := clock_timestamp()+interval '2 minutes';
   END IF;
   IF TG_OP='UPDATE' THEN
     IF OLD.status='PENDING' AND NEW.status='CONFIRMED'
        AND OLD.hold_expires_at <= clock_timestamp() THEN
       RAISE EXCEPTION 'Seat hold expired' USING ERRCODE='23514';
     END IF;
   END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.status='CONFIRMED' AND NEW.status='CANCELLED'
      AND app_current_role()='STUDENT' THEN
     SELECT end_time INTO STRICT v_end_time FROM class_sessions
     WHERE class_session_id=OLD.class_session_id;
     IF v_end_time <= clock_timestamp() THEN
       RAISE EXCEPTION 'Class session has ended; seat cancellation is closed' USING ERRCODE='23514';
     END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION hold_class_seat(p_session bigint,p_seat bigint,p_student bigint)
RETURNS seat_reservations LANGUAGE plpgsql AS $$
DECLARE v_session class_sessions; v_status text; v_seat seats; v_result seat_reservations;
BEGIN
 SELECT * INTO STRICT v_session FROM class_sessions WHERE class_session_id=p_session FOR UPDATE;
 SELECT status INTO STRICT v_status FROM bookings WHERE booking_id=v_session.booking_id FOR UPDATE;
 IF v_status <> 'CONFIRMED' THEN
   RAISE EXCEPTION 'Class booking must be approved before seat registration' USING ERRCODE='23514';
 END IF;
 IF v_session.end_time <= clock_timestamp() THEN
   RAISE EXCEPTION 'Class session has ended; seat registration is closed' USING ERRCODE='23514';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
   WHERE ur.user_id=p_student AND r.role_name='STUDENT') THEN
   RAISE EXCEPTION 'Student account required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO STRICT v_seat FROM seats WHERE seat_id=p_seat FOR UPDATE;
 IF v_seat.room_id<>v_session.room_id OR v_seat.status<>'AVAILABLE' THEN
   RAISE EXCEPTION 'Seat must be available in this class room' USING ERRCODE='23514';
 END IF;
 UPDATE seat_reservations SET status='CANCELLED' WHERE class_session_id=p_session
   AND status='PENDING' AND hold_expires_at<=clock_timestamp();
 SELECT * INTO v_result FROM seat_reservations WHERE class_session_id=p_session
   AND seat_id=p_seat AND user_id=p_student AND status='PENDING';
 IF FOUND THEN RETURN v_result; END IF;
 INSERT INTO seat_reservations(class_session_id,seat_id,user_id,room_id,status,hold_expires_at)
 VALUES(p_session,p_seat,p_student,v_session.room_id,'PENDING',clock_timestamp()+interval '2 minutes')
 RETURNING * INTO v_result;
 RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION confirm_class_seat(p_reservation bigint,p_student bigint)
RETURNS seat_reservations LANGUAGE plpgsql AS $$
DECLARE v_session bigint; v_end_time timestamptz; v_result seat_reservations;
BEGIN
 SELECT class_session_id INTO STRICT v_session FROM seat_reservations WHERE seat_reservation_id=p_reservation;
 SELECT end_time INTO STRICT v_end_time FROM class_sessions WHERE class_session_id=v_session FOR UPDATE;
 PERFORM 1 FROM bookings b JOIN class_sessions cs USING(booking_id)
 WHERE cs.class_session_id=v_session FOR UPDATE OF b;
 IF v_end_time <= clock_timestamp() THEN
   RAISE EXCEPTION 'Class session has ended; seat confirmation is closed' USING ERRCODE='23514';
 END IF;
 SELECT * INTO STRICT v_result FROM seat_reservations WHERE seat_reservation_id=p_reservation FOR UPDATE;
 IF v_result.user_id<>p_student THEN RAISE EXCEPTION 'Seat hold belongs to another user' USING ERRCODE='42501'; END IF;
 IF v_result.status='CONFIRMED' THEN RETURN v_result; END IF;
 IF v_result.status<>'PENDING' OR v_result.hold_expires_at<=clock_timestamp() THEN
   RAISE EXCEPTION 'Seat hold expired or cancelled' USING ERRCODE='23514';
 END IF;
 UPDATE seat_reservations SET status='CONFIRMED' WHERE seat_reservation_id=p_reservation RETURNING * INTO v_result;
 RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION cancel_class_seat(p_reservation bigint,p_student bigint)
RETURNS seat_reservations LANGUAGE plpgsql AS $$
DECLARE v_session bigint; v_end_time timestamptz; v_result seat_reservations;
BEGIN
 SELECT class_session_id INTO STRICT v_session FROM seat_reservations WHERE seat_reservation_id=p_reservation;
 SELECT end_time INTO STRICT v_end_time FROM class_sessions WHERE class_session_id=v_session FOR UPDATE;
 IF v_end_time <= clock_timestamp() THEN
   RAISE EXCEPTION 'Class session has ended; seat cancellation is closed' USING ERRCODE='23514';
 END IF;
 SELECT * INTO STRICT v_result FROM seat_reservations WHERE seat_reservation_id=p_reservation FOR UPDATE;
 IF v_result.user_id<>p_student THEN RAISE EXCEPTION 'Seat reservation belongs to another user' USING ERRCODE='42501'; END IF;
 UPDATE seat_reservations SET status='CANCELLED' WHERE seat_reservation_id=p_reservation RETURNING * INTO v_result;
 RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION hold_class_seat(bigint,bigint,bigint),
 confirm_class_seat(bigint,bigint),cancel_class_seat(bigint,bigint) FROM PUBLIC;
COMMIT;
