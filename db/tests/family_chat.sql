-- Run on an isolated branch with a test connection permitted to SET ROLE.
-- Requires one household with at least two members and another household.
-- All fixture mutations are rolled back inside the exception subtransaction.
DO $test$
DECLARE
  v_sender uuid;
  v_recipient uuid;
  v_household uuid;
  v_other_member uuid;
  v_other_household uuid;
  v_message uuid;
  v_count integer;
BEGIN
  BEGIN
    SELECT m.id, m.household_id INTO v_sender, v_household
    FROM family.members m
    WHERE m.family_role = 'admin' AND m.is_active
      AND EXISTS (
        SELECT 1 FROM family.members sibling
        WHERE sibling.household_id = m.household_id
          AND sibling.id <> m.id
          AND sibling.is_active
      )
    LIMIT 1;

    SELECT id INTO v_recipient
    FROM family.members
    WHERE household_id = v_household AND id <> v_sender AND is_active
    LIMIT 1;

    SELECT id, household_id INTO v_other_member, v_other_household
    FROM family.members
    WHERE household_id <> v_household AND family_role = 'admin' AND is_active
    LIMIT 1;

    IF v_sender IS NULL OR v_recipient IS NULL OR v_other_member IS NULL THEN
      RAISE EXCEPTION 'Missing isolated chat test fixtures';
    END IF;

    PERFORM set_config('app.member_id', v_sender::text, true);
    PERFORM set_config('app.household_id', v_household::text, true);
    PERFORM set_config('app.family_role', 'admin', true);
    SET LOCAL ROLE family_admin;

    INSERT INTO family.chat_messages (household_id, sender_id, body)
    VALUES (v_household, v_sender, '__family_chat_test__')
    RETURNING id INTO v_message;

    SELECT count(*) INTO v_count
    FROM family.chat_messages WHERE id = v_message;
    IF v_count <> 1 THEN RAISE EXCEPTION 'Sender cannot read own family message'; END IF;

    BEGIN
      INSERT INTO family.chat_messages (household_id, sender_id, body)
      VALUES (v_household, v_recipient, '__spoofed_sender__');
      RAISE EXCEPTION 'Sender spoofing was allowed';
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
    END;

    RESET ROLE;
    PERFORM set_config('app.member_id', v_recipient::text, true);
    PERFORM set_config('app.family_role', 'guest', true);
    SET LOCAL ROLE family_guest;

    IF NOT EXISTS (SELECT 1 FROM family.chat_messages WHERE id = v_message) THEN
      RAISE EXCEPTION 'Family member cannot read a family message';
    END IF;

    RESET ROLE;
    PERFORM set_config('app.member_id', v_other_member::text, true);
    PERFORM set_config('app.household_id', v_other_household::text, true);
    PERFORM set_config('app.family_role', 'admin', true);
    SET LOCAL ROLE family_admin;

    IF EXISTS (SELECT 1 FROM family.chat_messages WHERE id = v_message) THEN
      RAISE EXCEPTION 'Cross-household chat message is visible';
    END IF;

    RESET ROLE;
    RAISE EXCEPTION USING ERRCODE = 'P9001', MESSAGE = 'rollback fixtures';
  EXCEPTION WHEN SQLSTATE 'P9001' THEN NULL;
  END;
END
$test$;
