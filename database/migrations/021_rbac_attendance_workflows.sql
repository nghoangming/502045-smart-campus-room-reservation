BEGIN;
SET LOCAL lock_timeout = '10s';

-- Upgrade 001-020 in place; do not replay their CREATE TABLE statements.
INSERT INTO permissions(permission_name) VALUES ('VIEW_OWN_ATTENDANCE') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.role_id,p.permission_id FROM roles r CROSS JOIN permissions p
WHERE (r.role_name='STUDENT' AND p.permission_name IN ('VIEW_ROOMS','CREATE_BOOKING','VIEW_OWN_ATTENDANCE'))
   OR (r.role_name='TEACHER' AND p.permission_name IN ('VIEW_RESOURCES','MANAGE_ATTENDANCE'))
ON CONFLICT DO NOTHING;
DELETE FROM role_permissions rp USING roles r,permissions p
WHERE rp.role_id=r.role_id AND rp.permission_id=p.permission_id AND
 ((r.role_name='ADMIN' AND p.permission_name='CREATE_OWN_ABSENCE_REQUEST') OR
  (r.role_name='TEACHER' AND p.permission_name='SELECT_SEAT'));


-- Capacity has one source of truth: installed seats, not a second editable count.
CREATE VIEW room_capacity AS
SELECT r.room_id,count(s.seat_id)::integer AS installed_seats,
 count(s.seat_id) FILTER (WHERE s.status='AVAILABLE')::integer AS usable_seats
FROM rooms r LEFT JOIN seats s USING(room_id) GROUP BY r.room_id;

CREATE VIEW own_attendance AS
SELECT a.* FROM attendance a
WHERE app_current_role()='STUDENT' AND a.user_id=app_current_user_id();
REVOKE ALL ON own_attendance FROM PUBLIC;

CREATE FUNCTION list_room_resources(p_room bigint) RETURNS SETOF resources LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
 JOIN role_permissions rp USING(role_id) JOIN permissions p USING(permission_id)
 WHERE ur.user_id=app_current_user_id() AND r.role_name=app_current_role()
 AND p.permission_name='VIEW_RESOURCES') THEN
 RAISE EXCEPTION 'Resource viewing permission required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT * FROM resources WHERE room_id=p_room;
END $$;
REVOKE ALL ON FUNCTION list_room_resources(bigint) FROM PUBLIC;

-- Audit writes run with the migration owner's privileges, never with a client search_path.
-- That owner must own audit_logs; application roles must not own these objects.
CREATE FUNCTION audit_attendance_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='UPDATE' AND to_jsonb(OLD)=to_jsonb(NEW) THEN RETURN NEW; END IF;
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data)
 VALUES(public.app_current_user_id(),TG_OP,'attendance',
   CASE WHEN TG_OP='DELETE' THEN OLD.attendance_id ELSE NEW.attendance_id END,
   CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END,
   CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION audit_attendance_change() FROM PUBLIC;
CREATE TRIGGER trg_audit_attendance AFTER INSERT OR UPDATE OR DELETE ON attendance
FOR EACH ROW EXECUTE FUNCTION audit_attendance_change();
CREATE FUNCTION protect_audit_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit history is append-only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER trg_protect_audit_history BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION protect_audit_history();

-- Authenticated backend sets transaction-local identity; never accept it from request JSON.
CREATE FUNCTION require_session_teacher(p_session bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF app_current_role() IS DISTINCT FROM 'TEACHER' OR NOT EXISTS (
 SELECT 1 FROM class_sessions cs JOIN bookings b USING(booking_id)
 JOIN user_roles ur ON ur.user_id=b.user_id JOIN roles r USING(role_id)
 WHERE cs.class_session_id=p_session AND b.user_id=app_current_user_id() AND r.role_name='TEACHER') THEN
 RAISE EXCEPTION 'Authenticated session teacher required' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION correct_attendance(p_attendance bigint,p_status text,p_reason text)
RETURNS attendance LANGUAGE plpgsql AS $$
DECLARE v attendance;
BEGIN
 SELECT * INTO STRICT v FROM attendance WHERE attendance_id=p_attendance FOR UPDATE;
 PERFORM require_session_teacher(v.class_session_id);
 IF p_status IS NULL OR p_status NOT IN ('PRESENT','LATE','ABSENT','EXCUSED') OR
    p_reason IS NULL OR btrim(p_reason)='' THEN
 RAISE EXCEPTION 'Valid attendance status and correction reason required' USING ERRCODE='23514'; END IF;
 UPDATE attendance SET attendance_status=p_status,evaluated_by=app_current_user_id(),
 evaluation_note=p_reason WHERE attendance_id=p_attendance RETURNING * INTO v;
 RETURN v;
END $$;

-- Default lateness starts at minute 15 within the existing [5,20) QR window.
-- Zero cancellation lead time means owners can cancel only BEFORE start; admin may override.
CREATE TABLE workflow_rules (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 late_after_minutes integer NOT NULL DEFAULT 15 CHECK(late_after_minutes BETWEEN 5 AND 19),
 cancellation_lead_minutes integer NOT NULL DEFAULT 0 CHECK(cancellation_lead_minutes>=0)
);
INSERT INTO workflow_rules DEFAULT VALUES;
REVOKE ALL ON workflow_rules FROM PUBLIC;

CREATE FUNCTION classify_attendance_checkin() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_start timestamptz; v_late integer;
BEGIN
 IF NEW.checkin_id IS NOT NULL AND (TG_OP='INSERT' OR
    NEW.checkin_id IS DISTINCT FROM OLD.checkin_id) AND NEW.attendance_status='PRESENT' THEN
 SELECT start_time INTO STRICT v_start FROM class_sessions WHERE class_session_id=NEW.class_session_id;
 SELECT late_after_minutes INTO STRICT v_late FROM workflow_rules;
 IF NEW.check_in_at>=v_start+make_interval(mins=>v_late) THEN NEW.attendance_status:='LATE'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_classify_attendance BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION classify_attendance_checkin();

CREATE FUNCTION finalize_class_attendance(p_session bigint) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_cs class_sessions; v_b bookings; v_count integer;
BEGIN
 SELECT * INTO STRICT v_cs FROM class_sessions WHERE class_session_id=p_session FOR UPDATE;
 SELECT * INTO STRICT v_b FROM bookings WHERE booking_id=v_cs.booking_id FOR UPDATE;
 PERFORM require_session_teacher(p_session);
 IF v_b.status<>'CONFIRMED' OR clock_timestamp()<LEAST(v_cs.start_time+interval '20 minutes',v_cs.end_time) THEN
 RAISE EXCEPTION 'Finalize only after check-in closes for a confirmed class' USING ERRCODE='23514'; END IF;
 INSERT INTO attendance(booking_id,user_id,class_session_id,seat_reservation_id,attendance_status,evaluated_by)
 SELECT v_b.booking_id,sr.user_id,p_session,sr.seat_reservation_id,'ABSENT',app_current_user_id()
 FROM seat_reservations sr WHERE sr.class_session_id=p_session AND sr.status='CONFIRMED'
 ON CONFLICT (class_session_id,user_id) DO UPDATE SET attendance_status='ABSENT',evaluated_by=EXCLUDED.evaluated_by
 WHERE attendance.attendance_status='PENDING';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END $$;

CREATE FUNCTION guard_booking_cancel_deadline() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_lead integer;
BEGIN
 IF NEW.status='CANCELLED' AND OLD.status IS DISTINCT FROM NEW.status THEN
 SELECT cancellation_lead_minutes INTO STRICT v_lead FROM workflow_rules;
 IF (app_current_role()='ADMIN' AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
 WHERE ur.user_id=app_current_user_id() AND r.role_name='ADMIN')) IS DISTINCT FROM true THEN
 -- Approved teacher absence is an administrative cancellation with its own deadline in 011.
 IF NOT EXISTS (SELECT 1 FROM absence_requests ar JOIN class_sessions cs USING(class_session_id)
 WHERE cs.booking_id=OLD.booking_id AND ar.request_type='TEACHER' AND ar.status='APPROVED')
 AND clock_timestamp()>=OLD.start_time-make_interval(mins=>v_lead) THEN
 RAISE EXCEPTION 'Booking owner cancellation deadline passed' USING ERRCODE='23514'; END IF;
 END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_booking_cancel_deadline BEFORE UPDATE OF status ON bookings
FOR EACH ROW EXECUTE FUNCTION guard_booking_cancel_deadline();


REVOKE ALL ON FUNCTION require_session_teacher(bigint),
 correct_attendance(bigint,text,text),
 finalize_class_attendance(bigint) FROM PUBLIC;
CREATE OR REPLACE FUNCTION revoke_class_checkin(p_session BIGINT,p_student BIGINT,p_teacher BIGINT)
RETURNS attendance LANGUAGE plpgsql AS $$
DECLARE v_booking bookings; v_attendance attendance;
BEGIN
  SELECT b.* INTO STRICT v_booking FROM class_sessions cs JOIN bookings b USING(booking_id)
      WHERE cs.class_session_id=p_session FOR UPDATE OF b;
  IF v_booking.user_id<>p_teacher OR NOT EXISTS (
      SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
      WHERE ur.user_id=p_teacher AND r.role_name='TEACHER') THEN
    RAISE EXCEPTION 'Only the session teacher may revoke check-in' USING ERRCODE='42501';
  END IF;
  SELECT * INTO STRICT v_attendance FROM attendance
      WHERE class_session_id=p_session AND user_id=p_student FOR UPDATE;
  IF v_attendance.attendance_status NOT IN ('PRESENT','LATE') OR v_attendance.checkin_id IS NULL THEN
    RAISE EXCEPTION 'Student is not checked in' USING ERRCODE='23514';
  END IF;
  UPDATE checkins SET revoked_at=clock_timestamp(),revoked_by=p_teacher
      WHERE checkin_id=v_attendance.checkin_id AND revoked_at IS NULL;
  UPDATE attendance SET attendance_status='PENDING',checkin_id=NULL,check_in_at=NULL,
      cancelled_at=clock_timestamp(),cancelled_by=p_teacher
      WHERE attendance_id=v_attendance.attendance_id RETURNING * INTO v_attendance;
  RETURN v_attendance;
END $$;

COMMIT;
