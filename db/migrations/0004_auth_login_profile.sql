-- Login lookup with the minimum profile fields needed to build a session.

BEGIN;

GRANT CREATE ON SCHEMA auth TO family_security;

CREATE OR REPLACE FUNCTION auth.lookup_login_v2(p_email text)
RETURNS TABLE(
  member_id uuid,
  password_hash text,
  failed_attempts integer,
  locked_until timestamptz,
  must_change boolean,
  household_id uuid,
  family_role text,
  is_active boolean,
  display_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, auth, family
AS $$
  SELECT c.member_id,
         c.password_hash,
         c.failed_attempts,
         c.locked_until,
         c.must_change,
         m.household_id,
         m.family_role::text,
         m.is_active AND h.is_active,
         m.display_name,
         c.email
  FROM auth.credential c
  JOIN family.members m ON m.id = c.member_id
  JOIN family.households h ON h.id = m.household_id
  WHERE lower(c.email) = lower(btrim(p_email));
$$;

REVOKE ALL ON FUNCTION auth.lookup_login_v2(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.lookup_login_v2(text) TO thuis_runtime;
ALTER FUNCTION auth.lookup_login_v2(text) OWNER TO family_security;

SET LOCAL ROLE family_security;
REVOKE EXECUTE ON FUNCTION auth.lookup_login(text) FROM thuis_runtime;
RESET ROLE;

REVOKE CREATE ON SCHEMA auth FROM family_security;

COMMIT;
