BEGIN;

ALTER TABLE family.sos_alerts
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_sharing boolean NOT NULL DEFAULT false;

-- Existing restrictive household/context policies remain in force.
-- An emergency is visible to every member of the same household, including guests.
DROP POLICY IF EXISTS sos_family_active_read ON family.sos_alerts;
CREATE POLICY sos_family_active_read ON family.sos_alerts
  FOR SELECT TO family_admin, family_parent, family_child, family_guest
  USING (status = 'active');

DROP POLICY IF EXISTS sos_self_update ON family.sos_alerts;
CREATE POLICY sos_self_update ON family.sos_alerts
  FOR UPDATE TO family_child, family_guest
  USING (member_id = app.member_id() AND status = 'active')
  WITH CHECK (member_id = app.member_id());

GRANT UPDATE (status, resolved_at, resolved_by, latitude, longitude, accuracy_m,
              location_updated_at, location_sharing)
  ON family.sos_alerts TO family_child, family_guest;

COMMIT;
