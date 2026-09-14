BEGIN;
ALTER TABLE family.members ADD COLUMN IF NOT EXISTS family_label text
  CHECK (family_label IN ('guest','son','daughter','mother','father'));
CREATE OR REPLACE VIEW family.v_members_roster WITH (security_invoker=true) AS
 SELECT id, household_id, display_name, avatar_url, family_role, is_active, family_label FROM family.members;
GRANT SELECT(family_label) ON family.members TO family_admin,family_parent,family_child,family_guest;
GRANT UPDATE(family_label,family_role) ON family.members TO family_security;
GRANT CREATE ON SCHEMA app TO family_security;
CREATE OR REPLACE FUNCTION app.classify_family_member(p_target uuid,p_label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,family,app AS $$
DECLARE
 v_actor uuid := nullif(current_setting('app.member_id',true),'')::uuid;
 v_household uuid := nullif(current_setting('app.household_id',true),'')::uuid;
 v_role family.family_role;
BEGIN
 IF p_label IS NULL OR p_label NOT IN ('guest','son','daughter','mother','father') THEN
  RAISE EXCEPTION 'Invalid family classification' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM family.members m JOIN family.households h ON h.id=m.household_id
 WHERE m.id=v_actor AND m.household_id=v_household AND m.family_role='admin' AND m.is_active AND h.is_active) THEN
  RAISE EXCEPTION 'Only an active family admin can classify members' USING ERRCODE='42501';
 END IF;
 v_role := CASE WHEN p_label IN ('mother','father') THEN 'parent'::family.family_role
 WHEN p_label IN ('son','daughter') THEN 'child'::family.family_role ELSE 'guest'::family.family_role END;
 UPDATE family.members SET family_label=p_label,family_role=v_role
 WHERE id=p_target AND household_id=v_household AND is_active AND family_role<>'admin';
 IF NOT FOUND THEN RAISE EXCEPTION 'Member cannot be changed' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION app.classify_family_member(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.classify_family_member(uuid,text) TO family_admin;
ALTER FUNCTION app.classify_family_member(uuid,text) OWNER TO family_security;
REVOKE CREATE ON SCHEMA app FROM family_security;
CREATE POLICY chores_child_read_unassigned ON family.chores FOR SELECT TO family_child
 USING (app.family_role()='child' AND assigned_to IS NULL);
COMMIT;