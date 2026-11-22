BEGIN;
SET LOCAL lock_timeout = '10s';

-- 007 already restricts SELF_STUDY to STUDENT and THEORY/LAB to TEACHER.
-- Recheck roles on approval/reactivation too, not only when the owner/room changes.
DROP TRIGGER trg_guard_booking_room_role ON bookings;
CREATE TRIGGER trg_guard_booking_room_role
BEFORE INSERT OR UPDATE OF user_id,room_id,status ON bookings
FOR EACH ROW EXECUTE FUNCTION guard_booking_room_role();

CREATE FUNCTION guard_booking_room_available() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_status text;
BEGIN
 -- Cancellation/rejection must remain possible while a room is under maintenance.
 IF NEW.status IN ('PENDING','CONFIRMED') THEN
   SELECT status INTO STRICT v_status FROM rooms WHERE room_id=NEW.room_id FOR SHARE;
   IF v_status <> 'ACTIVE' THEN
     RAISE EXCEPTION 'Room is not active; booking is unavailable' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_booking_room_available
BEFORE INSERT OR UPDATE OF room_id,status,start_time,end_time ON bookings
FOR EACH ROW EXECUTE FUNCTION guard_booking_room_available();

-- Maintenance may begin after approval: do not accept new holds/confirmations.
CREATE FUNCTION guard_seat_room_available() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_status text;
BEGIN
 IF NEW.status IN ('PENDING','CONFIRMED') THEN
   SELECT status INTO STRICT v_status FROM rooms WHERE room_id=NEW.room_id FOR SHARE;
   IF v_status <> 'ACTIVE' THEN
     RAISE EXCEPTION 'Room is not active; seat registration is unavailable' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_seat_room_available
BEFORE INSERT OR UPDATE OF status,room_id,seat_id,class_session_id ON seat_reservations
FOR EACH ROW EXECUTE FUNCTION guard_seat_room_available();

COMMIT;
