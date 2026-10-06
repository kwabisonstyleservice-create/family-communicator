-- Isolated branch ONLY. Requires migration 0015 and permission to SET ROLE.
-- Uses existing active test members. All mutations roll back.
DO $test$
DECLARE
  sender record;
  peer record;
  outsider record;
  alert_id uuid;
  affected integer;
BEGIN
  BEGIN
    FOR sender IN
      SELECT DISTINCT ON (family_role) id, household_id, family_role::text AS role
      FROM family.members WHERE is_active AND family_role IN ('child', 'guest')
      ORDER BY family_role, id
    LOOP
      SELECT id, household_id, family_role::text AS role INTO peer FROM family.members
        WHERE is_active AND household_id = sender.household_id AND id <> sender.id LIMIT 1;
      SELECT id, household_id, family_role::text AS role INTO outsider FROM family.members
        WHERE is_active AND household_id <> sender.household_id LIMIT 1;
      IF peer.id IS NULL OR outsider.id IS NULL THEN
        RAISE EXCEPTION 'Missing peer or unrelated-household test fixture';
      END IF;
      PERFORM set_config('app.member_id', sender.id::text, true);
      PERFORM set_config('app.household_id', sender.household_id::text, true);
      PERFORM set_config('app.family_role', sender.role, true);
      EXECUTE format('SET LOCAL ROLE %I', 'family_' || sender.role);
      INSERT INTO family.sos_alerts (household_id, member_id, message, location_sharing)
        VALUES (sender.household_id, sender.id, '__sos_test__', true) RETURNING id INTO alert_id;
      UPDATE family.sos_alerts SET latitude = 52.37, longitude = 5.22,
        accuracy_m = 10, location_updated_at = now() WHERE id = alert_id;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 1 THEN RAISE EXCEPTION 'Sender cannot share own SOS coordinates'; END IF;
      RESET ROLE;

      PERFORM set_config('app.member_id', peer.id::text, true);
      PERFORM set_config('app.household_id', peer.household_id::text, true);
      PERFORM set_config('app.family_role', peer.role, true);
      EXECUTE format('SET LOCAL ROLE %I', 'family_' || peer.role);
      SELECT count(*) INTO affected FROM family.sos_alerts WHERE id = alert_id AND latitude = 52.37;
      IF affected <> 1 THEN RAISE EXCEPTION 'Same-family peer cannot see active SOS'; END IF;
      RESET ROLE;

      PERFORM set_config('app.member_id', outsider.id::text, true);
      PERFORM set_config('app.household_id', outsider.household_id::text, true);
      PERFORM set_config('app.family_role', outsider.role, true);
      EXECUTE format('SET LOCAL ROLE %I', 'family_' || outsider.role);
      SELECT count(*) INTO affected FROM family.sos_alerts WHERE id = alert_id;
      IF affected <> 0 THEN RAISE EXCEPTION 'SOS leaked across households'; END IF;
      RESET ROLE;

      PERFORM set_config('app.member_id', sender.id::text, true);
      PERFORM set_config('app.household_id', sender.household_id::text, true);
      PERFORM set_config('app.family_role', sender.role, true);
      EXECUTE format('SET LOCAL ROLE %I', 'family_' || sender.role);
      UPDATE family.sos_alerts SET location_sharing = false, latitude = NULL,
        longitude = NULL, accuracy_m = NULL, location_updated_at = NULL WHERE id = alert_id;
      UPDATE family.sos_alerts SET latitude = 52, longitude = 5
        WHERE id = alert_id AND status = 'active' AND location_sharing;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'Delayed location update resumed sharing'; END IF;
      UPDATE family.sos_alerts SET status = 'resolved', resolved_at = now(), resolved_by = sender.id
        WHERE id = alert_id;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 1 THEN RAISE EXCEPTION 'Sender cannot end own SOS'; END IF;
      RESET ROLE;
    END LOOP;
    IF alert_id IS NULL THEN RAISE EXCEPTION 'Missing child/guest sender fixtures'; END IF;
    RAISE EXCEPTION USING ERRCODE = 'P9001', MESSAGE = 'rollback SOS fixtures';
  EXCEPTION WHEN SQLSTATE 'P9001' THEN NULL;
  END;
END
$test$;
