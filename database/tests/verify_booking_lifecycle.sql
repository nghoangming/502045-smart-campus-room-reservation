BEGIN;
DO $$
DECLARE t bigint; t2 bigint; s bigint; other_user bigint; admin_id bigint;
 r1 bigint; r2 bigint; chair1 bigint; chair2 bigint; b1 bigint; b2 bigint; b3 bigint;
 c1 bigint; c2 bigint; absence_id bigint; held seat_reservations; result bookings;
BEGIN
 SELECT user_id INTO STRICT t FROM users WHERE user_code='teacher';
 SELECT user_id INTO STRICT s FROM users WHERE user_code='student';
 SELECT user_id INTO STRICT admin_id FROM users WHERE user_code='admin';
 INSERT INTO users(user_code,full_name,email,password_hash,faculty_code)
 VALUES('lifecycle-teacher','Teacher 2','lifecycle-t@test.invalid','test','A') RETURNING user_id INTO t2;
 INSERT INTO user_roles SELECT t2,role_id FROM roles WHERE role_name='TEACHER';
 INSERT INTO users(user_code,full_name,email,password_hash,faculty_code)
 VALUES('lifecycle-student','Student 2','lifecycle-s@test.invalid','test','A') RETURNING user_id INTO other_user;
 INSERT INTO user_roles SELECT other_user,role_id FROM roles WHERE role_name='STUDENT';
 INSERT INTO rooms(room_code,name,status) VALUES('A-LIFE1','Lifecycle 1','ACTIVE') RETURNING room_id INTO r1;
 INSERT INTO rooms(room_code,name,status) VALUES('A-LIFE2','Lifecycle 2','ACTIVE') RETURNING room_id INTO r2;
 INSERT INTO seats(room_id,seat_number,status) VALUES(r1,1,'AVAILABLE') RETURNING seat_id INTO chair1;
 INSERT INTO seats(room_id,seat_number,status) VALUES(r2,1,'AVAILABLE') RETURNING seat_id INTO chair2;
 INSERT INTO bookings(user_id,room_id,start_time,end_time)
 VALUES(t,r1,now()+interval '5 days',now()+interval '5 days 2 hours') RETURNING booking_id INTO b1;
 BEGIN
   INSERT INTO bookings(user_id,room_id,start_time,end_time)
   VALUES(t,r2,now()+interval '5 days 1 hour',now()+interval '5 days 3 hours');
   RAISE EXCEPTION 'TEST: teacher overlap accepted';
 EXCEPTION WHEN exclusion_violation THEN NULL; END;
 -- Adjacent intervals are permitted.
 INSERT INTO bookings(user_id,room_id,start_time,end_time)
 VALUES(t,r2,now()+interval '5 days 2 hours',now()+interval '5 days 4 hours') RETURNING booking_id INTO b3;
 INSERT INTO bookings(user_id,room_id,start_time,end_time)
 VALUES(t2,r2,now()+interval '5 days',now()+interval '5 days 2 hours') RETURNING booking_id INTO b2;
 INSERT INTO class_sessions(booking_id,course_code,title,room_id,start_time,end_time)
 SELECT booking_id,'LIFE1','Lifecycle 1',room_id,start_time,end_time FROM bookings WHERE booking_id=b1 RETURNING class_session_id INTO c1;
 INSERT INTO class_sessions(booking_id,course_code,title,room_id,start_time,end_time)
 SELECT booking_id,'LIFE2','Lifecycle 2',room_id,start_time,end_time FROM bookings WHERE booking_id=b2 RETURNING class_session_id INTO c2;
 BEGIN
   PERFORM review_booking(b1,t,true);
   RAISE EXCEPTION 'TEST: teacher approved booking';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 result:=review_booking(b1,admin_id,true,'Approved');
 IF result.reviewed_by<>admin_id OR result.reviewed_at IS NULL THEN RAISE EXCEPTION 'TEST: missing review audit'; END IF;
 PERFORM review_booking(b2,admin_id,true);
 BEGIN
   PERFORM review_booking(b1,admin_id,false);
   RAISE EXCEPTION 'TEST: reviewed confirmed booking';
 EXCEPTION WHEN check_violation THEN NULL; END;
 held:=hold_class_seat(c1,chair1,s);
 BEGIN
   PERFORM hold_class_seat(c2,chair2,s);
   RAISE EXCEPTION 'TEST: overlapping pending student holds';
 EXCEPTION WHEN exclusion_violation THEN NULL; END;
 held:=confirm_class_seat(held.seat_reservation_id,s);
 BEGIN
   PERFORM hold_class_seat(c2,chair2,s);
   RAISE EXCEPTION 'TEST: student overlapped confirmed class';
 EXCEPTION WHEN exclusion_violation THEN NULL; END;
 BEGIN
   PERFORM cancel_booking(b1,other_user);
   RAISE EXCEPTION 'TEST: stranger cancelled booking';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 -- Supply an existing challenge directly to test revocation independently of wall time.
 INSERT INTO checkin_challenges(class_session_id,manual_code,issued_by,expires_at)
 VALUES(c1,'A1234',t,clock_timestamp()+interval '2 minutes');
 result:=cancel_booking(b1,t,'Cancelled by owner');
 IF result.cancelled_by<>t OR result.cancelled_at IS NULL THEN RAISE EXCEPTION 'TEST: missing cancellation audit'; END IF;
 IF EXISTS(SELECT 1 FROM seat_reservations WHERE class_session_id=c1 AND status<>'CANCELLED') THEN
   RAISE EXCEPTION 'TEST: seats not cancelled'; END IF;
 IF EXISTS(SELECT 1 FROM checkin_challenges WHERE class_session_id=c1 AND revoked_at IS NULL) THEN
   RAISE EXCEPTION 'TEST: challenge not revoked'; END IF;
 IF (SELECT calendar_status FROM class_session_calendar WHERE class_session_id=c1)<>'CANCELLED' THEN
   RAISE EXCEPTION 'TEST: calendar not cancelled'; END IF;
 IF (SELECT reservation_status FROM class_seat_availability WHERE class_session_id=c1 AND seat_id=chair1)<>'UNAVAILABLE' THEN
   RAISE EXCEPTION 'TEST: cancelled class offers seats'; END IF;
 PERFORM set_config('app.user_id',s::text,true);
 PERFORM set_config('app.role','STUDENT',true);
 IF (SELECT calendar_status FROM student_faculty_calendar WHERE class_session_id=c1) IS DISTINCT FROM 'CANCELLED' THEN
   RAISE EXCEPTION 'TEST: student calendar lost cancellation status'; END IF;
 PERFORM cancel_booking(b1,t); -- Idempotent cancellation.
 BEGIN
   UPDATE bookings SET status='CONFIRMED' WHERE booking_id=b1;
   RAISE EXCEPTION 'TEST: cancelled booking reactivated';
 EXCEPTION WHEN check_violation THEN NULL; END;
 held:=hold_class_seat(c2,chair2,s); -- cancellation released student's interval
 UPDATE seat_reservations SET hold_expires_at=clock_timestamp()-interval '1 second'
 WHERE seat_reservation_id=held.seat_reservation_id;
 -- A third simultaneous class reclaims expired hold from a different session.
 INSERT INTO bookings(user_id,room_id,start_time,end_time)
 VALUES(t,r1,now()+interval '5 days',now()+interval '5 days 2 hours') RETURNING booking_id INTO b1;
 PERFORM review_booking(b1,admin_id,true);
 INSERT INTO class_sessions(booking_id,course_code,title,room_id,start_time,end_time)
 SELECT booking_id,'LIFE3','Lifecycle 3',room_id,start_time,end_time FROM bookings WHERE booking_id=b1 RETURNING class_session_id INTO c1;
 PERFORM hold_class_seat(c1,chair1,s);
 IF (SELECT status FROM seat_reservations WHERE seat_reservation_id=held.seat_reservation_id)<>'CANCELLED' THEN
   RAISE EXCEPTION 'TEST: expired cross-session hold not reclaimed'; END IF;
 UPDATE bookings SET status='CANCELLED' WHERE booking_id=b1; -- direct SQL also syncs
 IF EXISTS(SELECT 1 FROM seat_reservations WHERE class_session_id=c1 AND status<>'CANCELLED') THEN
   RAISE EXCEPTION 'TEST: direct cancellation did not sync'; END IF;
 result:=review_booking(b3,admin_id,false,'Rejected');
 IF result.status<>'REJECTED' THEN RAISE EXCEPTION 'TEST: rejection failed'; END IF;
 -- Existing teacher-absence workflow still releases seats and keeps ABSENT on calendar.
 held:=hold_class_seat(c2,chair2,other_user);
 PERFORM confirm_class_seat(held.seat_reservation_id,other_user);
 SELECT absence_request_id INTO absence_id FROM request_teacher_absence(c2,t2,'Teacher unavailable');
 PERFORM review_teacher_absence(absence_id,admin_id,true);
 IF (SELECT status FROM bookings WHERE booking_id=b2)<>'CANCELLED'
 OR (SELECT status FROM seat_reservations WHERE seat_reservation_id=held.seat_reservation_id)<>'CANCELLED'
 OR (SELECT calendar_status FROM class_session_calendar WHERE class_session_id=c2)<>'ABSENT' THEN
   RAISE EXCEPTION 'TEST: teacher absence workflow regressed'; END IF;
 RAISE NOTICE 'PASS: teacher/student overlaps, adjacency, approval rights, lifecycle, cancellation sync, calendar, challenge revocation, expiry';
END $$;
ROLLBACK;
