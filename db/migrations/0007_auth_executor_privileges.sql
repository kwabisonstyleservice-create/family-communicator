BEGIN;

-- family_security is a NOLOGIN owner for SECURITY DEFINER functions. Grant only
-- the tables those functions need; the web runtime never receives this role.
GRANT SELECT, INSERT, DELETE ON auth.account TO family_security;
GRANT SELECT, INSERT, UPDATE ON auth.credential TO family_security;

GRANT SELECT, INSERT ON family.households, family.members TO family_security;
GRANT SELECT, UPDATE ON family.household_invite TO family_security;
GRANT SELECT, INSERT ON family.member_privacy_settings TO family_security;

COMMIT;
