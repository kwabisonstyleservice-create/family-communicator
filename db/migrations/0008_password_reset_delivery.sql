-- Make password-reset creation private, rate-limited, and useful to the email sender.
-- The public UI must still return the same response for known and unknown emails.

BEGIN;

GRANT CREATE ON SCHEMA auth TO family_security;

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
DECLARE
  v_email text := lower(btrim(p_email));
BEGIN
  IF v_email IS NULL
     OR v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     OR p_token_hash !~ '^[0-9a-f]{64}$'
     OR p_expires_at <= now()
     OR p_expires_at > now() + interval '30 minutes' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.credential c
    JOIN family.members m ON m.id = c.member_id
    JOIN family.households h ON h.id = m.household_id
    WHERE lower(c.email) = v_email AND m.is_active AND h.is_active
  ) THEN
    RETURN false;
  END IF;

  -- Prevent repeated requests from flooding a family member's inbox.
  IF EXISTS (
    SELECT 1 FROM auth.password_reset_tokens
    WHERE lower(email) = v_email AND created_at > now() - interval '60 seconds'
  ) OR (
    SELECT count(*) FROM auth.password_reset_tokens
    WHERE lower(email) = v_email AND created_at > now() - interval '1 hour'
  ) >= 5 THEN
    RETURN false;
  END IF;

  UPDATE auth.password_reset_tokens
  SET used_at = now()
  WHERE lower(email) = v_email AND used_at IS NULL;

  INSERT INTO auth.password_reset_tokens (email, token_hash, expires_at)
  VALUES (v_email, p_token_hash, p_expires_at);

  DELETE FROM auth.password_reset_tokens
  WHERE expires_at < now() - interval '1 day';

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION auth.request_password_reset(text,character,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.request_password_reset(text,character,timestamptz) TO thuis_runtime;
ALTER FUNCTION auth.request_password_reset(text,character,timestamptz) OWNER TO family_security;

REVOKE CREATE ON SCHEMA auth FROM family_security;

COMMIT;
