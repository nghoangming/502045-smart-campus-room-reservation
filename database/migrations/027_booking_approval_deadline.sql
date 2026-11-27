BEGIN;

-- The database check also protects callers other than the HTTP API and closes
-- the race where a request passes API validation just before its start time.
CREATE OR REPLACE FUNCTION review_booking(p_booking bigint,p_admin bigint,p_approve boolean,p_note text DEFAULT NULL)
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
 IF p_approve AND v_result.start_time<=clock_timestamp() THEN
   RAISE EXCEPTION 'Cannot approve a reservation after its start time' USING ERRCODE='23514'; END IF;
 UPDATE bookings SET status=CASE WHEN p_approve THEN 'CONFIRMED' ELSE 'REJECTED' END,
   reviewed_by=p_admin,reviewed_at=clock_timestamp(),review_note=p_note
 WHERE booking_id=p_booking RETURNING * INTO v_result;
 RETURN v_result;
END $$;

CREATE FUNCTION guard_booking_approval_deadline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='PENDING' AND NEW.status='CONFIRMED'
    AND OLD.start_time<=clock_timestamp() THEN
   RAISE EXCEPTION 'Cannot approve a reservation after its start time' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_booking_approval_deadline BEFORE UPDATE OF status ON bookings
FOR EACH ROW EXECUTE FUNCTION guard_booking_approval_deadline();

COMMIT;
