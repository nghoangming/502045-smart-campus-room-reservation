\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE t bigint; s bigint; ad bigint; r bigint; chair bigint; b bigint; c class_sessions;
 sr seat_reservations; a attendance; ch checkin_challenges; n integer; before_n integer;
BEGIN
 SELECT user_id INTO STRICT t FROM users WHERE user_code='teacher';
 SELECT user_id INTO STRICT s FROM users WHERE user_code='student';
 SELECT user_id INTO STRICT ad FROM users WHERE user_code='admin';
 IF NOT EXISTS (SELECT 1 FROM roles JOIN role_permissions USING(role_id) JOIN permissions USING(permission_id)
 WHERE role_name='STUDENT' AND permission_name='CREATE_BOOKING') THEN RAISE EXCEPTION 'Missing student booking permission'; END IF;
 INSERT INTO rooms(room_code,name,status) VALUES('A-021','Workflow test','ACTIVE') RETURNING room_id INTO r;
 BEGIN
 UPDATE rooms SET status='TYPO' WHERE room_id=r;
 RAISE EXCEPTION 'Invalid room status accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO seats(room_id,seat_number,status) VALUES(r,1,'AVAILABLE') RETURNING seat_id INTO chair;
 INSERT INTO bookings(user_id,room_id,start_time,end_time)
 VALUES(t,r,clock_timestamp()-interval '16 minutes',clock_timestamp()+interval '1 hour') RETURNING booking_id INTO b;
 PERFORM set_config('app.user_id',ad::text,true); PERFORM set_config('app.role','ADMIN',true);
 c:=approve_class_booking(b,'TEST021','Workflow test');
 sr:=hold_class_seat(c.class_session_id,chair,s);
 sr:=confirm_class_seat(sr.seat_reservation_id,s);
 PERFORM set_config('app.user_id',t::text,true); PERFORM set_config('app.role','TEACHER',true);
 ch:=issue_checkin_challenge(c.class_session_id,t);
 PERFORM submit_class_checkin(c.class_session_id,s,'QR',ch.qr_token::text);
 SELECT * INTO STRICT a FROM attendance WHERE class_session_id=c.class_session_id AND user_id=s;
 IF a.attendance_status<>'LATE' THEN RAISE EXCEPTION 'Late check-in not classified'; END IF;
 a:=revoke_class_checkin(c.class_session_id,s,t);
 IF a.attendance_status<>'PENDING' THEN RAISE EXCEPTION 'Late revocation failed'; END IF;
 PERFORM submit_class_checkin(c.class_session_id,s,'QR',ch.qr_token::text);
 SELECT count(*) INTO before_n FROM audit_logs WHERE entity_type='attendance' AND entity_id=a.attendance_id;
 a:=correct_attendance(a.attendance_id,'EXCUSED','Teacher correction');
 IF a.evaluated_by<>t THEN RAISE EXCEPTION 'Missing correction actor'; END IF;
 SELECT count(*) INTO n FROM audit_logs WHERE entity_type='attendance' AND entity_id=a.attendance_id;
 IF n<>before_n+1 THEN RAISE EXCEPTION 'Missing correction history'; END IF;
 BEGIN
 DELETE FROM audit_logs WHERE entity_type='attendance';
 RAISE EXCEPTION 'Audit history deleted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('app.user_id',s::text,true); PERFORM set_config('app.role','STUDENT',true);
 IF NOT EXISTS (SELECT 1 FROM own_attendance WHERE attendance_id=a.attendance_id) THEN RAISE EXCEPTION 'Own attendance hidden'; END IF;
 BEGIN
 PERFORM correct_attendance(a.attendance_id,'PRESENT','Unauthorized correction');
 RAISE EXCEPTION 'Student corrected attendance';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('app.user_id',t::text,true); PERFORM set_config('app.role','TEACHER',true);
 BEGIN
 PERFORM cancel_booking(b,t,'Too late');
 RAISE EXCEPTION 'Owner cancelled after start';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
 PERFORM finalize_class_attendance(c.class_session_id);
 RAISE EXCEPTION 'Finalized before close';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM list_room_resources(r);
 PERFORM set_config('app.user_id',ad::text,true); PERFORM set_config('app.role','ADMIN',true);
 PERFORM cancel_booking(b,ad,'Administrative exception');
 INSERT INTO bookings(user_id,room_id,start_time,end_time)
 VALUES(t,r,now()-interval '1 day',now()-interval '22 hours') RETURNING booking_id INTO b;
 c:=approve_class_booking(b,'PAST021','Closed class');
 sr:=hold_class_seat(c.class_session_id,chair,s);
 sr:=confirm_class_seat(sr.seat_reservation_id,s);
 PERFORM set_config('app.user_id',t::text,true); PERFORM set_config('app.role','TEACHER',true);
 n:=finalize_class_attendance(c.class_session_id);
 IF n<>1 OR NOT EXISTS (SELECT 1 FROM attendance WHERE class_session_id=c.class_session_id
 AND user_id=s AND attendance_status='ABSENT') THEN RAISE EXCEPTION 'Missing absent student'; END IF;
 IF finalize_class_attendance(c.class_session_id)<>0 THEN RAISE EXCEPTION 'Finalize not idempotent'; END IF;
 SELECT * INTO a FROM attendance WHERE class_session_id=c.class_session_id AND user_id=s;
 PERFORM correct_attendance(a.attendance_id,'EXCUSED','Approved excuse');
 PERFORM finalize_class_attendance(c.class_session_id);
 IF NOT EXISTS (SELECT 1 FROM attendance WHERE attendance_id=a.attendance_id AND attendance_status='EXCUSED')
 THEN RAISE EXCEPTION 'Finalize overwrote excuse'; END IF;
 IF (SELECT installed_seats FROM room_capacity WHERE room_id=r)<>1 THEN RAISE EXCEPTION 'Incorrect capacity'; END IF;
END $$;
ROLLBACK;
