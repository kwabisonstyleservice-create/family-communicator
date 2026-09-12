BEGIN;

ALTER TABLE auth.password_reset_tokens
  DROP CONSTRAINT IF EXISTS password_reset_email_shape;
ALTER TABLE auth.password_reset_tokens
  ADD CONSTRAINT password_reset_email_shape
  CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

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
     OR p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
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

REVOKE ALL ON FUNCTION auth.register_account(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.register_account(text,text,text) TO thuis_runtime;

COMMIT;
