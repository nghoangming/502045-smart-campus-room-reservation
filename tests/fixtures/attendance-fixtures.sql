-- Data-only fixtures for QR and ended-session API tests. This file does not
-- create/alter schema objects. Run via scripts/provision-attendance-fixtures.ps1.
BEGIN;

CREATE TEMP TABLE _fixture_context AS
SELECT :'teacher_email'::text AS teacher_email,
       :'admin_email'::text AS admin_email,
       :'student_email'::text AS student_email,
       :'student2_email'::text AS student2_email;
CREATE TEMP TABLE _fixture_ids (fixture_key text PRIMARY KEY, fixture_value text NOT NULL);

DO $$
DECLARE
  v_teacher bigint; v_teacher2 bigint; v_admin bigint; v_student bigint; v_student2 bigint;
  v_lab bigint; v_theory bigint; v_seat_a bigint; v_seat_b bigint; v_seat_end bigint;
  v_start timestamptz := clock_timestamp() - interval '6 minutes';
  v_end timestamptz := clock_timestamp() + interval '54 minutes';
  v_booking_a bigint; v_booking_b bigint; v_booking_end bigint;
  v_session_a bigint; v_session_b bigint; v_session_end bigint;
  v_reservation_end bigint; v_valid_code text; v_stamp text;
  v_old_booking bigint;
BEGIN
  SELECT u.user_id INTO STRICT v_teacher FROM users u JOIN _fixture_context c ON lower(u.email)=lower(c.teacher_email);
  SELECT u.user_id INTO v_teacher2 FROM users u WHERE lower(u.email)='teacher2@smartcampus.test';
  IF v_teacher2 IS NULL THEN
    INSERT INTO users(user_code,full_name,email,password_hash,faculty,faculty_code,email_verified)
    SELECT 'teacher2','Playwright Teacher 2','teacher2@smartcampus.test',password_hash,faculty,faculty_code,TRUE
    FROM users WHERE user_id=v_teacher RETURNING user_id INTO v_teacher2;
    INSERT INTO user_roles(user_id,role_id) SELECT v_teacher2,role_id FROM roles WHERE role_name='TEACHER';
  END IF;
  SELECT u.user_id INTO STRICT v_admin FROM users u JOIN _fixture_context c ON lower(u.email)=lower(c.admin_email);
  SELECT u.user_id INTO STRICT v_student FROM users u JOIN _fixture_context c ON lower(u.email)=lower(c.student_email);
  SELECT u.user_id INTO STRICT v_student2 FROM users u JOIN _fixture_context c ON lower(u.email)=lower(c.student2_email);
  SELECT room_id INTO STRICT v_lab FROM rooms WHERE status='ACTIVE' AND type='LAB' ORDER BY room_id LIMIT 1;
  SELECT room_id INTO STRICT v_theory FROM rooms WHERE status='ACTIVE' AND type='THEORY' ORDER BY room_id LIMIT 1;
  SELECT seat_id INTO STRICT v_seat_a FROM seats WHERE room_id=v_lab ORDER BY seat_number LIMIT 1;
  SELECT seat_id INTO STRICT v_seat_b FROM seats WHERE room_id=v_theory ORDER BY seat_number LIMIT 1;
  SELECT seat_id INTO STRICT v_seat_end FROM seats WHERE room_id=v_lab ORDER BY seat_number DESC LIMIT 1;
  v_stamp := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');

  -- Retire only old, explicitly named Playwright QR fixture bookings so a
  -- repeated run does not collide with them or the repository's prior QR demo.
  PERFORM set_config('app.user_id',v_admin::text,true);
  PERFORM set_config('app.role','ADMIN',true);
  FOR v_old_booking IN
    SELECT b.booking_id FROM bookings b JOIN class_sessions cs USING(booking_id)
    WHERE b.status='CONFIRMED'
      AND cs.title IN ('QA QR window fixture','Playwright QR valid and expired','Playwright QR wrong class and workflow','Playwright ended session fixture')
  LOOP
    PERFORM cancel_booking(v_old_booking,v_admin,'Replaced by refreshed Playwright attendance fixtures');
  END LOOP;

  INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
  VALUES(v_teacher2,v_lab,v_start,v_end,'CONFIRMED') RETURNING booking_id INTO v_booking_a;
  INSERT INTO class_sessions(booking_id,course_code,title,room_id,start_time,end_time)
  VALUES(v_booking_a,'QRA'||v_stamp,'Playwright QR valid and expired',v_lab,v_start,v_end)
  RETURNING class_session_id INTO v_session_a;
  INSERT INTO seat_reservations(class_session_id,seat_id,user_id,room_id,status,start_time,end_time)
  VALUES(v_session_a,v_seat_a,v_student,v_lab,'CONFIRMED',v_start,v_end);
  SELECT manual_code INTO STRICT v_valid_code FROM issue_checkin_challenge(v_session_a,v_admin);
  INSERT INTO checkin_challenges(class_session_id,booking_id,manual_code,issued_by,issued_at,expires_at,revoked_at)
  VALUES(v_session_a,v_booking_a,'EX001',v_admin,clock_timestamp()-interval '5 minutes',clock_timestamp()-interval '3 minutes',clock_timestamp());

  INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
  VALUES(v_teacher,v_theory,v_start,v_end,'CONFIRMED') RETURNING booking_id INTO v_booking_b;
  INSERT INTO class_sessions(booking_id,course_code,title,room_id,start_time,end_time)
  VALUES(v_booking_b,'QRB'||v_stamp,'Playwright QR wrong class and workflow',v_theory,v_start,v_end)
  RETURNING class_session_id INTO v_session_b;
  INSERT INTO seat_reservations(class_session_id,seat_id,user_id,room_id,status,start_time,end_time)
  VALUES(v_session_b,v_seat_b,v_student2,v_theory,'CONFIRMED',v_start,v_end);

  INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
  VALUES(v_teacher,v_lab,clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour','CONFIRMED')
  RETURNING booking_id INTO v_booking_end;
  INSERT INTO class_sessions(booking_id,course_code,title,room_id,start_time,end_time)
  SELECT v_booking_end,'END'||v_stamp,'Playwright ended session fixture',v_lab,start_time,end_time
  FROM bookings WHERE booking_id=v_booking_end
  RETURNING class_session_id INTO v_session_end;
  -- A confirmed historical seat can only exist if it was reserved before the
  -- class ended. This fixture represents that persisted state directly; only
  -- this insert bypasses the temporal trigger, and the setting is transaction-local.
  PERFORM set_config('session_replication_role','replica',true);
  INSERT INTO seat_reservations(class_session_id,seat_id,user_id,room_id,status,start_time,end_time)
  SELECT v_session_end,v_seat_end,v_student,v_lab,'CONFIRMED',start_time,end_time
  FROM bookings WHERE booking_id=v_booking_end
  RETURNING seat_reservation_id INTO v_reservation_end;
  PERFORM set_config('session_replication_role','origin',true);

  INSERT INTO _fixture_ids VALUES
    ('qr_session',v_session_a::text),
    ('qr_valid_code',v_valid_code),
    ('qr_expired_code','EX001'),
    ('qr_wrong_session',v_session_b::text),
    ('qr_workflow_session',v_session_b::text),
    ('finalize_session',v_session_end::text),
    ('ended_session',v_session_end::text),
    ('ended_seat',v_seat_end::text),
    ('ended_reservation',v_reservation_end::text);
END $$;

SELECT (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='qr_session'),
       (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='qr_valid_code'),
       (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='qr_expired_code'),
       (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='qr_wrong_session'),
       (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='qr_workflow_session'),
       (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='finalize_session'),
       (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='ended_session'),
       (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='ended_seat'),
       (SELECT fixture_value FROM _fixture_ids WHERE fixture_key='ended_reservation');

COMMIT;
