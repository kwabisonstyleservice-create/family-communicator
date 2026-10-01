BEGIN;
ALTER TABLE family.members DROP CONSTRAINT members_family_label_check;
ALTER TABLE family.members ADD CONSTRAINT members_family_label_check CHECK (family_label IN ('guest','son','daughter','mother','father','brother','sister','big_brother','big_sister','little_brother','little_sister','uncle','aunt'));
GRANT CREATE ON SCHEMA app TO family_security;
CREATE OR REPLACE FUNCTION app.classify_family_member(p_target uuid,p_label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,family,app AS $$
DECLARE
 v_actor uuid := nullif(current_setting('app.member_id',true),'')::uuid;
 v_household uuid := nullif(current_setting('app.household_id',true),'')::uuid;
 v_role family.family_role;
BEGIN
 IF p_label IS NULL OR p_label NOT IN ('guest','son','daughter','mother','father','brother','sister','big_brother','big_sister','little_brother','little_sister','uncle','aunt') THEN
  RAISE EXCEPTION 'Invalid family classification' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM family.members m JOIN family.households h ON h.id=m.household_id
 WHERE m.id=v_actor AND m.household_id=v_household AND m.family_role='admin' AND m.is_active AND h.is_active) THEN
  RAISE EXCEPTION 'Only an active family admin can classify members' USING ERRCODE='42501';
 END IF;
 v_role := CASE WHEN p_label IN ('mother','father') THEN 'parent'::family.family_role
 WHEN p_label IN ('son','daughter') THEN 'child'::family.family_role ELSE 'guest'::family.family_role END;
 UPDATE family.members SET family_label=p_label,family_role=CASE WHEN p_label IN ('brother','sister','big_brother','big_sister','little_brother','little_sister','uncle','aunt') THEN CASE WHEN family_role='guest' THEN 'child'::family.family_role ELSE family_role END ELSE v_role END
 WHERE id=p_target AND household_id=v_household AND is_active AND family_role<>'admin';
 IF NOT FOUND THEN RAISE EXCEPTION 'Member cannot be changed' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION app.classify_family_member(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.classify_family_member(uuid,text) TO family_admin;
ALTER FUNCTION app.classify_family_member(uuid,text) OWNER TO family_security;
REVOKE CREATE ON SCHEMA app FROM family_security;
COMMIT;
