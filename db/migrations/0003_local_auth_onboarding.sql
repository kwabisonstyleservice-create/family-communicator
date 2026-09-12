-- Family Communicator authentication and onboarding functions.
-- Password hashing and reset-token hashing happen in the server application;
-- plaintext passwords and reset tokens are never stored in Postgres.

BEGIN;

CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_email_shape
    CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'),
  CONSTRAINT password_reset_hash_shape
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT password_reset_expiry_check
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS password_reset_email_active_idx
  ON auth.password_reset_tokens (lower(email), expires_at DESC)
  WHERE used_at IS NULL;

REVOKE ALL ON auth.password_reset_tokens FROM PUBLIC;
GRANT USAGE ON SCHEMA auth TO thuis_runtime;
GRANT CREATE ON SCHEMA auth TO family_security;

CREATE OR REPLACE FUNCTION auth.register_account(
  p_email text,
  p_password_hash text,
  p_display_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, auth
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  IF p_email IS NULL
     OR p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'
     OR length(p_password_hash) < 50
     OR length(btrim(coalesce(p_display_name, ''))) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Invalid registration details' USING ERRCODE = '22023';
  END IF;

  INSERT INTO auth.account (email, password_hash, display_name)
  VALUES (lower(btrim(p_email)), p_password_hash, btrim(p_display_name))
  RETURNING id INTO v_account_id;

  RETURN v_account_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'An account already exists for this email' USING ERRCODE = '23505';
END $$;

CREATE OR REPLACE FUNCTION auth.create_household(
  p_account_id uuid,
  p_household_name text
)
RETURNS TABLE(member_id uuid, household_id uuid, family_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, auth, family
AS $$
DECLARE
  v_email text;
  v_hash text;
  v_name text;
  v_locked_until timestamptz;
  v_household uuid;
  v_member uuid;
BEGIN
  IF p_account_id IS NULL
     OR length(btrim(coalesce(p_household_name, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Invalid household details' USING ERRCODE = '22023';
  END IF;

  SELECT a.email, a.password_hash, a.display_name, a.locked_until
  INTO v_email, v_hash, v_name, v_locked_until
  FROM auth.account a
  WHERE a.id = p_account_id
  FOR UPDATE;

  IF NOT FOUND OR (v_locked_until IS NOT NULL AND v_locked_until > now()) THEN
    RAISE EXCEPTION 'Account is not available for onboarding' USING ERRCODE = '28000';
  END IF;

  INSERT INTO family.households (name)
  VALUES (btrim(p_household_name))
  RETURNING id INTO v_household;

  INSERT INTO family.members (household_id, auth_subject, display_name, family_role, email)
  VALUES (v_household, 'local:' || p_account_id::text, v_name, 'admin', v_email)
  RETURNING id INTO v_member;

  INSERT INTO auth.credential (member_id, email, password_hash)
  VALUES (v_member, v_email, v_hash);

  DELETE FROM auth.account WHERE id = p_account_id;

  RETURN QUERY SELECT v_member, v_household, 'admin'::text;
END $$;

CREATE OR REPLACE FUNCTION auth.record_login_result(
  p_member_id uuid,
  p_succeeded boolean
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, auth
AS $$
DECLARE
  v_locked_until timestamptz;
BEGIN
  IF p_succeeded THEN
    UPDATE auth.credential
    SET failed_attempts = 0,
        locked_until = NULL,
        last_login_at = now(),
        updated_at = now()
    WHERE member_id = p_member_id
    RETURNING locked_until INTO v_locked_until;
  ELSE
    UPDATE auth.credential
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE
          WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
          ELSE locked_until
        END,
        updated_at = now()
    WHERE member_id = p_member_id
    RETURNING locked_until INTO v_locked_until;
  END IF;

  RETURN v_locked_until;
END $$;

CREATE OR REPLACE FUNCTION auth.request_password_reset(
  p_email text,
  p_token_hash char(64),
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, auth, family
AS $$
BEGIN
  IF p_token_hash !~ '^[0-9a-f]{64}$'
     OR p_expires_at <= now()
     OR p_expires_at > now() + interval '30 minutes' THEN
    RAISE EXCEPTION 'Invalid reset request' USING ERRCODE = '22023';
  END IF;

  UPDATE auth.password_reset_tokens
  SET used_at = now()
  WHERE lower(email) = lower(btrim(p_email)) AND used_at IS NULL;

  IF EXISTS (
    SELECT 1
    FROM auth.credential c
    JOIN family.members m ON m.id = c.member_id
    JOIN family.households h ON h.id = m.household_id
    WHERE lower(c.email) = lower(btrim(p_email)) AND m.is_active AND h.is_active
  ) THEN
    INSERT INTO auth.password_reset_tokens (email, token_hash, expires_at)
    VALUES (lower(btrim(p_email)), p_token_hash, p_expires_at);
  END IF;

  -- Always return true so callers cannot enumerate registered email addresses.
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION auth.consume_password_reset(
  p_token_hash char(64),
  p_new_password_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, auth
AS $$
DECLARE
  v_token_id uuid;
  v_email text;
BEGIN
  IF p_token_hash !~ '^[0-9a-f]{64}$' OR length(p_new_password_hash) < 50 THEN
    RETURN false;
  END IF;

  SELECT t.id, t.email INTO v_token_id, v_email
  FROM auth.password_reset_tokens t
  WHERE t.token_hash = p_token_hash
    AND t.used_at IS NULL
    AND t.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE auth.credential
  SET password_hash = p_new_password_hash,
      must_change = false,
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  WHERE lower(email) = lower(v_email);

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE auth.password_reset_tokens SET used_at = now() WHERE id = v_token_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION auth.register_account(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.create_household(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.record_login_result(uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.request_password_reset(text,character,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.consume_password_reset(character,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION auth.register_account(text,text,text) TO thuis_runtime;
GRANT EXECUTE ON FUNCTION auth.create_household(uuid,text) TO thuis_runtime;
GRANT EXECUTE ON FUNCTION auth.record_login_result(uuid,boolean) TO thuis_runtime;
GRANT EXECUTE ON FUNCTION auth.request_password_reset(text,character,timestamptz) TO thuis_runtime;
GRANT EXECUTE ON FUNCTION auth.consume_password_reset(character,text) TO thuis_runtime;

ALTER FUNCTION auth.register_account(text,text,text) OWNER TO family_security;
ALTER FUNCTION auth.create_household(uuid,text) OWNER TO family_security;
ALTER FUNCTION auth.record_login_result(uuid,boolean) OWNER TO family_security;
ALTER FUNCTION auth.request_password_reset(text,character,timestamptz) OWNER TO family_security;
ALTER FUNCTION auth.consume_password_reset(character,text) OWNER TO family_security;

ALTER TABLE auth.password_reset_tokens OWNER TO family_security;

SET LOCAL ROLE family_security;
GRANT EXECUTE ON FUNCTION auth.lookup_login(text) TO thuis_runtime;
GRANT EXECUTE ON FUNCTION auth.redeem_invite(uuid,text) TO thuis_runtime;
REVOKE EXECUTE ON FUNCTION app.lookup_principal(text) FROM thuis_runtime;
REVOKE EXECUTE ON FUNCTION app.create_household(text,text,text,text) FROM thuis_runtime;
REVOKE EXECUTE ON FUNCTION app.join_household(text,text,text,text) FROM thuis_runtime;
RESET ROLE;

REVOKE CREATE ON SCHEMA auth FROM family_security;

COMMIT;
