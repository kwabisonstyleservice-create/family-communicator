BEGIN;
CREATE TABLE family.appearance_settings (
 household_id uuid PRIMARY KEY REFERENCES family.households(id) ON DELETE CASCADE,
 theme text NOT NULL DEFAULT 'forest' CHECK (theme IN ('forest','teal','ocean','navy','violet','plum','rose','burgundy','terracotta','amber','olive','slate'))
);
ALTER TABLE family.appearance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.appearance_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY appearance_household ON family.appearance_settings AS RESTRICTIVE FOR ALL TO PUBLIC
 USING (household_id=app.household_id() AND app.member_id() IS NOT NULL AND app.family_role() IS NOT NULL)
 WITH CHECK (household_id=app.household_id() AND app.member_id() IS NOT NULL AND app.family_role() IS NOT NULL);
CREATE POLICY appearance_read ON family.appearance_settings FOR SELECT TO family_admin,family_parent,family_child,family_guest USING (true);
CREATE POLICY appearance_admin_insert ON family.appearance_settings FOR INSERT TO family_admin WITH CHECK (app.family_role()='admin');
CREATE POLICY appearance_admin_update ON family.appearance_settings FOR UPDATE TO family_admin USING (app.family_role()='admin') WITH CHECK (app.family_role()='admin');
REVOKE ALL ON family.appearance_settings FROM PUBLIC;
GRANT SELECT ON family.appearance_settings TO family_admin,family_parent,family_child,family_guest;
GRANT INSERT,UPDATE ON family.appearance_settings TO family_admin;
ALTER TABLE family.appearance_settings OWNER TO family_owner;
COMMIT;
