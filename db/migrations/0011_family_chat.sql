BEGIN;

CREATE TABLE IF NOT EXISTS family.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_sender_household_fk
    FOREIGN KEY (sender_id, household_id)
    REFERENCES family.members(id, household_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS chat_messages_household_time_idx
  ON family.chat_messages (household_id, created_at DESC, id DESC);

ALTER TABLE family.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.chat_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rst_context_required ON family.chat_messages;
CREATE POLICY rst_context_required ON family.chat_messages
  AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (app.member_id() IS NOT NULL AND app.family_role() IS NOT NULL)
  WITH CHECK (app.member_id() IS NOT NULL AND app.family_role() IS NOT NULL);

DROP POLICY IF EXISTS rst_household_isolation ON family.chat_messages;
CREATE POLICY rst_household_isolation ON family.chat_messages
  AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (household_id = app.household_id())
  WITH CHECK (household_id = app.household_id());

DROP POLICY IF EXISTS chat_messages_family_read ON family.chat_messages;
CREATE POLICY chat_messages_family_read ON family.chat_messages
  FOR SELECT TO family_admin, family_parent, family_child, family_guest
  USING (true);

DROP POLICY IF EXISTS chat_messages_self_insert ON family.chat_messages;
CREATE POLICY chat_messages_self_insert ON family.chat_messages
  FOR INSERT TO family_admin, family_parent, family_child, family_guest
  WITH CHECK (sender_id = app.member_id());

REVOKE ALL ON family.chat_messages FROM PUBLIC;
GRANT SELECT, INSERT ON family.chat_messages
  TO family_admin, family_parent, family_child, family_guest;

ALTER TABLE family.chat_messages OWNER TO family_owner;

COMMIT;
