BEGIN;
SET LOCAL lock_timeout = '10s';

-- A teacher's new pending request notifies every administrator once.
-- The existing approval trigger continues to notify the teacher and students.
CREATE FUNCTION notify_admin_teacher_absence_request() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  INSERT INTO public.notifications
      (user_id, title, message, notification_type, related_booking_id)
  SELECT DISTINCT ur.user_id,
      'Giảng viên báo vắng - chờ duyệt',
      'Giảng viên ' || teacher.full_name || ' báo vắng buổi ' || cs.title ||
      ' tại phòng ' || room.room_code || ', ' ||
      to_char(cs.start_time AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI') ||
      '. Vui lòng xem và duyệt yêu cầu.',
      'ABSENCE', cs.booking_id
  FROM public.class_sessions cs
  JOIN public.rooms room ON room.room_id = cs.room_id
  JOIN public.users teacher ON teacher.user_id = NEW.user_id
  JOIN public.roles role ON role.role_name = 'ADMIN'
  JOIN public.user_roles ur ON ur.role_id = role.role_id
  WHERE cs.class_session_id = NEW.class_session_id;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION notify_admin_teacher_absence_request() FROM PUBLIC;
CREATE TRIGGER trg_notify_admin_teacher_absence_request
AFTER INSERT ON absence_requests
FOR EACH ROW
WHEN (NEW.request_type = 'TEACHER' AND NEW.status = 'PENDING')
EXECUTE FUNCTION notify_admin_teacher_absence_request();

COMMIT;
