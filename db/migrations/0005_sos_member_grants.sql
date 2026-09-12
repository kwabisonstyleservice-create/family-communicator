BEGIN;

-- The row policies already restrict children and guests to their own SOS rows.
-- These table privileges activate those existing policies for every family member.
GRANT SELECT, INSERT ON family.sos_alerts TO family_child, family_guest;

COMMIT;
