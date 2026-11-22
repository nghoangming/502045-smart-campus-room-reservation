-- Run after 001-019 on an isolated database, as migration owner. Fixtures roll back.
BEGIN;
DO $$
DECLARE t bigint; s bigint; outsider bigint; rm bigint; study bigint; chair bigint;
 b bigint; session bigint; held seat_reservations; yr integer; n integer;
BEGIN
 SELECT user_id INTO STRICT t FROM users WHERE user_code='teacher';
 INSERT INTO users(user_code,full_name,email,password_hash,faculty_code)
 VALUES ('faculty-outsider','Outsider','outsider@test.invalid','test','K') RETURNING user_id INTO outsider;
 INSERT INTO user_roles SELECT outsider,role_id FROM roles WHERE role_name='STUDENT';
 INSERT INTO rooms(room_code,name,status) VALUES('A-FACULTY','Faculty test','ACTIVE') RETURNING room_id INTO rm;
 INSERT INTO rooms(room_code,name,status) VALUES('C-FACULTY','Study test','ACTIVE') RETURNING room_id INTO study;
 INSERT INTO seats(room_id,seat_number,status) VALUES(rm,1,'AVAILABLE') RETURNING seat_id INTO chair;
 INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
 VALUES(t,rm,now()+interval '1 day',now()+interval '25 hours','CONFIRMED') RETURNING booking_id INTO b;
 INSERT INTO class_sessions(booking_id,course_code,title,room_id,start_time,end_time)
 SELECT booking_id,'FACULTY','Faculty test',room_id,start_time,end_time FROM bookings WHERE booking_id=b
 RETURNING class_session_id INTO session;
 IF (SELECT faculty_code FROM class_sessions WHERE class_session_id=session) IS DISTINCT FROM 'A' THEN
   RAISE EXCEPTION 'TEST: trigger did not assign teacher faculty'; END IF;
 BEGIN
   UPDATE class_sessions SET faculty_code='K' WHERE class_session_id=session;
   RAISE EXCEPTION 'TEST: session faculty changed manually';
 EXCEPTION WHEN check_violation THEN NULL; END;
 FOR yr IN 0..3 LOOP
   INSERT INTO users(user_code,full_name,email,password_hash,faculty_code,entry_year)
   VALUES('faculty-year-'||yr,'Same faculty','year'||yr||'@test.invalid','test','A',2026-yr) RETURNING user_id INTO s;
   INSERT INTO user_roles SELECT s,role_id FROM roles WHERE role_name='STUDENT';
   PERFORM set_config('app.user_id',s::text,true);
   PERFORM set_config('app.role','STUDENT',true);
   SELECT count(*) INTO n FROM student_faculty_calendar WHERE class_session_id=session;
   IF n<>1 THEN RAISE EXCEPTION 'TEST: same faculty timetable hidden for year %',yr; END IF;
   held:=hold_class_seat(session,chair,s);
   held:=confirm_class_seat(held.seat_reservation_id,s);
   IF held.status<>'CONFIRMED' THEN RAISE EXCEPTION 'TEST: same faculty confirmation failed'; END IF;
   PERFORM cancel_class_seat(held.seat_reservation_id,s);
 END LOOP;
 PERFORM set_config('app.user_id',outsider::text,true);
 SELECT count(*) INTO n FROM student_faculty_calendar WHERE class_session_id=session;
 IF n<>0 THEN RAISE EXCEPTION 'TEST: other faculty sees timetable'; END IF;
 BEGIN
   PERFORM hold_class_seat(session,chair,outsider);
   RAISE EXCEPTION 'TEST: other faculty registered';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO seat_reservations(class_session_id,seat_id,user_id,room_id,status)
   VALUES(session,chair,outsider,rm,'CONFIRMED');
   RAISE EXCEPTION 'TEST: direct insert bypassed faculty';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 -- Students can book study rooms; teachers cannot. Students cannot book classrooms.
 INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
 VALUES(s,study,now()+interval '2 days',now()+interval '49 hours','PENDING');
 BEGIN
   INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
   VALUES(t,study,now()+interval '3 days',now()+interval '73 hours','PENDING');
   RAISE EXCEPTION 'TEST: teacher booked study room';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
   VALUES(s,rm,now()+interval '3 days',now()+interval '73 hours','PENDING');
   RAISE EXCEPTION 'TEST: student booked classroom';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 held:=hold_class_seat(session,chair,s);
 UPDATE rooms SET status='MAINTENANCE' WHERE room_id IN (rm,study);
 BEGIN
   PERFORM confirm_class_seat(held.seat_reservation_id,s);
   RAISE EXCEPTION 'TEST: confirmed seat in maintenance room';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM cancel_class_seat(held.seat_reservation_id,s);
 BEGIN
   PERFORM hold_class_seat(session,chair,s);
   RAISE EXCEPTION 'TEST: held seat in maintenance room';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
   VALUES(s,study,now()+interval '3 days',now()+interval '73 hours','PENDING');
   RAISE EXCEPTION 'TEST: booked maintenance room';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE bookings SET status='CANCELLED' WHERE booking_id=b;
 BEGIN
   UPDATE bookings SET status='CONFIRMED' WHERE booking_id=b;
   RAISE EXCEPTION 'TEST: reactivated maintenance booking';
 EXCEPTION WHEN check_violation THEN NULL; END;
 RAISE NOTICE 'PASS: faculty timetable, all four years, faculty seat guard, study-room roles, maintenance and cancellation';
END $$;
ROLLBACK;
