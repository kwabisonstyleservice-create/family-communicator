-- Run after 0012 on an isolated branch with a connection permitted to SET ROLE.
-- Fixture mutations are rolled back inside the exception subtransaction.
DO $test$
DECLARE
  v_member uuid;
  v_household uuid;
  v_role text;
  v_slot smallint;
  v_count integer;
BEGIN
  BEGIN
    SELECT id, household_id, family_role::text INTO v_member, v_household, v_role
    FROM family.members
    WHERE family_role IN ('child', 'guest') AND is_active
    LIMIT 1;

    IF v_member IS NULL THEN RAISE EXCEPTION 'Missing child or guest test fixture'; END IF;

    PERFORM set_config('app.member_id', v_member::text, true);
    PERFORM set_config('app.household_id', v_household::text, true);
    PERFORM set_config('app.family_role', v_role, true);
    EXECUTE format('SET LOCAL ROLE %I', 'family_' || v_role);

    INSERT INTO family.chores (household_id, assigned_to, title, points)
    VALUES (v_household, v_member, '__member_task_test__', 0);

    BEGIN
      INSERT INTO family.chores (household_id, assigned_to, title, points)
      VALUES (v_household, v_member, '__self_awarded_points__', 10);
      RAISE EXCEPTION 'A member was allowed to award task points';
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
    END;

    FOR v_slot IN 1..2 LOOP
      INSERT INTO family.gratitude_entries
        (household_id, member_id, body, gratitude_date, entry_slot)
      VALUES (v_household, v_member, '__gratitude_test__',
              (now() AT TIME ZONE 'Europe/Amsterdam')::date, v_slot);
    END LOOP;

    SELECT count(*) INTO v_count
    FROM family.gratitude_entries
    WHERE member_id = v_member
      AND gratitude_date = (now() AT TIME ZONE 'Europe/Amsterdam')::date;
    IF v_count < 2 THEN RAISE EXCEPTION 'Two daily gratitude entries were not readable'; END IF;

    BEGIN
      INSERT INTO family.gratitude_entries
        (household_id, member_id, body, gratitude_date, entry_slot)
      VALUES (v_household, v_member, '__third_gratitude__',
              (now() AT TIME ZONE 'Europe/Amsterdam')::date, 3);
      RAISE EXCEPTION 'A third daily gratitude entry was allowed';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    RESET ROLE;
    RAISE EXCEPTION USING ERRCODE = 'P9001', MESSAGE = 'rollback fixtures';
  EXCEPTION WHEN SQLSTATE 'P9001' THEN NULL;
  END;
END
$test$;
