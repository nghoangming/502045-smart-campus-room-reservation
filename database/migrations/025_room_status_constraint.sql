BEGIN;
SET LOCAL lock_timeout = '10s';

-- Match the room states accepted by the admin API and UI. Reject unexpected
-- legacy values instead of silently changing their meaning.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM rooms WHERE status NOT IN ('ACTIVE', 'MAINTENANCE')) THEN
    RAISE EXCEPTION 'rooms.status contains unsupported values; inspect and correct them before running 025'
      USING ERRCODE = '23514';
  END IF;
END $$;

ALTER TABLE rooms
  ADD CONSTRAINT chk_rooms_status
  CHECK (status IN ('ACTIVE', 'MAINTENANCE'));

COMMIT;
