BEGIN;

CREATE TABLE IF NOT EXISTS family.gratitude_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 500),
  gratitude_date date NOT NULL,
  entry_slot smallint NOT NULL CHECK (entry_slot BETWEEN 1 AND 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gratitude_entries_member_household_fk
    FOREIGN KEY (member_id, household_id)
    REFERENCES family.members(id, household_id)
    ON DELETE CASCADE,
  CONSTRAINT gratitude_entries_member_day_slot_key
    UNIQUE (member_id, gratitude_date, entry_slot)
);

CREATE INDEX IF NOT EXISTS gratitude_entries_household_day_idx
  ON family.gratitude_entries (household_id, gratitude_date DESC, created_at DESC);

ALTER TABLE family.gratitude_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.gratitude_entries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rst_context_required ON family.gratitude_entries;
CREATE POLICY rst_context_required ON family.gratitude_entries
  AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (app.member_id() IS NOT NULL AND app.family_role() IS NOT NULL)
  WITH CHECK (app.member_id() IS NOT NULL AND app.family_role() IS NOT NULL);

DROP POLICY IF EXISTS rst_household_isolation ON family.gratitude_entries;
CREATE POLICY rst_household_isolation ON family.gratitude_entries
  AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (household_id = app.household_id())
  WITH CHECK (household_id = app.household_id());

DROP POLICY IF EXISTS gratitude_family_recent_read ON family.gratitude_entries;
CREATE POLICY gratitude_family_recent_read ON family.gratitude_entries
  FOR SELECT TO family_admin, family_parent, family_child, family_guest
  USING (created_at >= now() - interval '31 days');

DROP POLICY IF EXISTS gratitude_self_insert ON family.gratitude_entries;
CREATE POLICY gratitude_self_insert ON family.gratitude_entries
  FOR INSERT TO family_admin, family_parent, family_child, family_guest
  WITH CHECK (
    member_id = app.member_id()
    AND gratitude_date = (now() AT TIME ZONE 'Europe/Amsterdam')::date
  );

REVOKE ALL ON family.gratitude_entries FROM PUBLIC;
GRANT SELECT, INSERT ON family.gratitude_entries
  TO family_admin, family_parent, family_child, family_guest;

-- Children and guests can create and manage only their own zero-point tasks.
-- Parents and admins retain the existing ability to assign and score tasks.
DROP POLICY IF EXISTS chores_member_insert_own ON family.chores;
CREATE POLICY chores_member_insert_own ON family.chores
  FOR INSERT TO family_child, family_guest
  WITH CHECK (assigned_to = app.member_id() AND points = 0);

DROP POLICY IF EXISTS chores_guest_read_own ON family.chores;
CREATE POLICY chores_guest_read_own ON family.chores
  FOR SELECT TO family_guest
  USING (app.family_role() = 'guest' AND assigned_to = app.member_id());

DROP POLICY IF EXISTS chores_guest_update_own ON family.chores;
CREATE POLICY chores_guest_update_own ON family.chores
  FOR UPDATE TO family_guest
  USING (app.family_role() = 'guest' AND assigned_to = app.member_id())
  WITH CHECK (app.family_role() = 'guest' AND assigned_to = app.member_id());

GRANT SELECT, INSERT ON family.chores TO family_child, family_guest;
REVOKE UPDATE ON family.chores FROM family_child, family_guest;
GRANT UPDATE(status, completed_at) ON family.chores TO family_child, family_guest;

ALTER TABLE family.gratitude_entries OWNER TO family_owner;

COMMIT;
