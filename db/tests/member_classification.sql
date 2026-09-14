-- Run only on an isolated test branch with a test connection permitted to SET ROLE.
-- Requires an admin and guest in one household and an admin in another.
-- All fixture mutations are rolled back inside the exception subtransaction.
DO $test$
DECLARE
  v_admin uuid;
  v_guest uuid;
  v_household uuid;
  v_other_admin uuid;
  v_count integer;
  v_role text;
  v_event uuid := gen_random_uuid();
  v_announcement uuid := gen_random_uuid();
  v_assigned_chore uuid := gen_random_uuid();
  v_shared_chore uuid := gen_random_uuid();
BEGIN
  BEGIN
    SELECT m.id, m.household_id INTO v_admin, v_household
    FROM family.members m
    WHERE m.family_role = 'admin'
      AND EXISTS (
        SELECT 1 FROM family.members g
        WHERE g.household_id = m.household_id AND g.family_role = 'guest'
      )
    LIMIT 1;

    SELECT id INTO v_guest
    FROM family.members
    WHERE household_id = v_household AND family_role = 'guest'
    LIMIT 1;

    SELECT id INTO v_other_admin
    FROM family.members
    WHERE household_id <> v_household AND family_role = 'admin'
    LIMIT 1;

    IF v_admin IS NULL OR v_guest IS NULL OR v_other_admin IS NULL THEN
      RAISE EXCEPTION 'Missing isolated test fixtures';
    END IF;

    INSERT INTO family.calendar_events
      (id, household_id, created_by, title, visibility, starts_at, ends_at)
    VALUES
      (v_event, v_household, v_admin, '__classification_test_event__', 'family', now(), now() + interval '1 hour');

    INSERT INTO family.announcements
      (id, household_id, created_by, title, body, visibility)
    VALUES
      (v_announcement, v_household, v_admin, '__classification_test_announcement__', 'test', 'family');

    INSERT INTO family.chores (id, household_id, assigned_to, title)
    VALUES
      (v_assigned_chore, v_household, v_guest, '__classification_test_assigned__'),
      (v_shared_chore, v_household, NULL, '__classification_test_shared__');

    PERFORM set_config('app.member_id', v_admin::text, true);
    PERFORM set_config('app.household_id', v_household::text, true);
    PERFORM set_config('app.family_role', 'admin', true);
    SET LOCAL ROLE family_admin;

    PERFORM app.classify_family_member(v_guest, 'son');

    BEGIN
      PERFORM app.classify_family_member(v_other_admin, 'father');
      RAISE EXCEPTION 'Cross-household classification was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
      PERFORM app.classify_family_member(v_admin, 'guest');
      RAISE EXCEPTION 'Admin downgrade was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    RESET ROLE;

    SELECT family_role::text INTO v_role
    FROM family.members WHERE id = v_guest;
    IF v_role <> 'child' THEN
      RAISE EXCEPTION 'Classification did not map son to child access';
    END IF;

    PERFORM set_config('app.member_id', v_guest::text, true);
    PERFORM set_config('app.family_role', 'child', true);
    SET LOCAL ROLE family_child;

    SELECT count(*) INTO v_count
    FROM family.v_members_roster WHERE household_id = v_household;
    IF v_count < 2 THEN RAISE EXCEPTION 'Child cannot see family roster'; END IF;

    IF EXISTS (
      SELECT 1 FROM family.v_members_roster WHERE household_id <> v_household
    ) THEN RAISE EXCEPTION 'Cross-household roster is visible'; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM family.v_calendar_public WHERE id = v_event
    ) THEN RAISE EXCEPTION 'Child cannot see shared calendar event'; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM family.announcements WHERE id = v_announcement
    ) THEN RAISE EXCEPTION 'Child cannot see family announcement'; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM family.chores WHERE id = v_assigned_chore
    ) THEN RAISE EXCEPTION 'Child cannot see assigned task'; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM family.chores WHERE id = v_shared_chore
    ) THEN RAISE EXCEPTION 'Child cannot see unassigned household task'; END IF;

    BEGIN
      PERFORM app.classify_family_member(v_guest, 'father');
      RAISE EXCEPTION 'Child privilege escalation was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    RESET ROLE;
    RAISE EXCEPTION USING ERRCODE = 'P9001', MESSAGE = 'rollback fixtures';
  EXCEPTION WHEN SQLSTATE 'P9001' THEN NULL;
  END;
END
$test$;