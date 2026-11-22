BEGIN;
SET LOCAL lock_timeout = '10s';

-- Keep booking and incident history intact. Only unused inventory can be removed.
CREATE FUNCTION delete_room_resource(p_resource bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_resource resources; v_actor bigint;
BEGIN
 v_actor := app_current_user_id();
 IF app_current_role() IS DISTINCT FROM 'ADMIN' OR NOT EXISTS (
  SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
  JOIN role_permissions rp USING(role_id) JOIN permissions p USING(permission_id)
  WHERE ur.user_id=v_actor AND r.role_name='ADMIN' AND p.permission_name='MANAGE_RESOURCES') THEN
  RAISE EXCEPTION 'Resource management permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_resource FROM resources WHERE resource_id=p_resource FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Resource not found' USING ERRCODE='P0002'; END IF;
 IF EXISTS (SELECT 1 FROM incidents WHERE resource_id=p_resource) THEN
  RAISE EXCEPTION 'Resource has incident history' USING ERRCODE='23P01'; END IF;
 DELETE FROM resources WHERE resource_id=p_resource;
 INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_data)
 VALUES(v_actor,'DELETE','resources',p_resource,to_jsonb(v_resource));
END $$;

CREATE FUNCTION delete_unused_room(p_room bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_room rooms; v_actor bigint;
BEGIN
 v_actor := app_current_user_id();
 IF app_current_role() IS DISTINCT FROM 'ADMIN' OR NOT EXISTS (
  SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
  JOIN role_permissions rp USING(role_id) JOIN permissions p USING(permission_id)
  WHERE ur.user_id=v_actor AND r.role_name='ADMIN' AND p.permission_name='MANAGE_ROOMS') THEN
  RAISE EXCEPTION 'Room management permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_room FROM rooms WHERE room_id=p_room FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Room not found' USING ERRCODE='P0002'; END IF;
 IF EXISTS (SELECT 1 FROM bookings WHERE room_id=p_room)
    OR EXISTS (SELECT 1 FROM class_sessions WHERE room_id=p_room)
    OR EXISTS (SELECT 1 FROM incidents WHERE room_id=p_room) THEN
  RAISE EXCEPTION 'Room has booking or incident history' USING ERRCODE='23P01'; END IF;
 -- These child rows were created with the room and have no historical references.
 INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_data)
 SELECT v_actor,'DELETE','resources',resource_id,to_jsonb(resources)
 FROM resources WHERE room_id=p_room;
 DELETE FROM resources WHERE room_id=p_room;
 DELETE FROM seats WHERE room_id=p_room;
 DELETE FROM rooms WHERE room_id=p_room;
 INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_data)
 VALUES(v_actor,'DELETE','rooms',p_room,to_jsonb(v_room));
END $$;

REVOKE ALL ON FUNCTION delete_room_resource(bigint), delete_unused_room(bigint) FROM PUBLIC;
COMMIT;
