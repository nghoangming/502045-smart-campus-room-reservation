BEGIN;

-- Add two assignment choices beside the existing person assignment.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_team VARCHAR(16);
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS chk_incident_team;
ALTER TABLE incidents ADD CONSTRAINT chk_incident_team
  CHECK (assigned_team IS NULL OR assigned_team IN ('HARDWARE','SOFTWARE'));
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS chk_incident_assignment_mode;
ALTER TABLE incidents ADD CONSTRAINT chk_incident_assignment_mode
  CHECK (assigned_to IS NULL OR assigned_team IS NULL);

-- Drop the former user-role assignment guard if that draft was applied.
DROP TRIGGER IF EXISTS trg_incident_assignment ON incidents;
DROP FUNCTION IF EXISTS guard_incident_assignment();
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
    WHERE r.role_name IN ('HARDWARE_STAFF','SOFTWARE_STAFF')
  ) THEN
    RAISE EXCEPTION 'Legacy staff roles are assigned to users; review those accounts before migration 028';
  END IF;
END $$;
DELETE FROM role_permissions rp USING roles r
WHERE rp.role_id=r.role_id AND r.role_name IN ('HARDWARE_STAFF','SOFTWARE_STAFF');
DELETE FROM roles WHERE role_name IN ('HARDWARE_STAFF','SOFTWARE_STAFF');

CREATE FUNCTION guard_incident_team() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assigned_team IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM users WHERE user_id=NEW.reported_by AND faculty_code IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Incident reporter must have a faculty before team assignment'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_incident_team BEFORE INSERT OR UPDATE OF assigned_team,reported_by
ON incidents FOR EACH ROW EXECUTE FUNCTION guard_incident_team();

-- Assignment scope stays within the existing admin and teacher access rules.
DROP POLICY IF EXISTS incidents_select_policy ON incidents;
CREATE POLICY incidents_select_policy ON incidents FOR SELECT USING (
  app_current_role()='ADMIN' OR reported_by=app_current_user_id()
);
DROP POLICY IF EXISTS incidents_update_policy ON incidents;
CREATE POLICY incidents_update_policy ON incidents FOR UPDATE
USING (app_current_role()='ADMIN')
WITH CHECK (app_current_role()='ADMIN');

COMMIT;
