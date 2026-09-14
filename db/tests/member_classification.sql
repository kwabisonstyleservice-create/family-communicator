-- Run only on an isolated test branch with a test connection permitted to SET ROLE.
-- Requires an admin and guest in one household and an admin in another.
-- All fixture mutations are rolled back inside the exception subtransaction.
DO $test$
DECLARE a uuid; g uuid; h uuid; other_admin uuid; n integer; r text;
BEGIN
 BEGIN
 SELECT m.id,m.household_id INTO a,h FROM family.members m WHERE family_role='admin'
 AND EXISTS(SELECT 1 FROM family.members g WHERE g.household_id=m.household_id AND g.family_role='guest') LIMIT 1;
 SELECT id INTO g FROM family.members WHERE household_id=h AND family_role='guest' LIMIT 1;
 SELECT id INTO other_admin FROM family.members WHERE household_id<>h AND family_role='admin' LIMIT 1;
 IF a IS NULL OR g IS NULL OR other_admin IS NULL THEN RAISE EXCEPTION 'Missing fixtures'; END IF;
 PERFORM set_config('app.member_id',a::text,true); PERFORM set_config('app.household_id',h::text,true); PERFORM set_config('app.family_role','admin',true);
 SET LOCAL ROLE family_admin;
 PERFORM app.classify_family_member(g,'son');
 BEGIN
  PERFORM app.classify_family_member(other_admin,'father');
  RAISE EXCEPTION 'Cross household change allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM app.classify_family_member(a,'guest');
  RAISE EXCEPTION 'Admin downgrade allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
 SELECT family_role::text INTO r FROM family.members WHERE id=g;
 IF r<>'child' THEN RAISE EXCEPTION 'Classification did not update role'; END IF;
 PERFORM set_config('app.member_id',g::text,true); PERFORM set_config('app.family_role','child',true);
 SET LOCAL ROLE family_child;
 SELECT count(*) INTO n FROM family.v_members_roster WHERE household_id=h;
 IF n<2 THEN RAISE EXCEPTION 'Child cannot see roster'; END IF;
 IF EXISTS(SELECT 1 FROM family.v_members_roster WHERE household_id<>h) THEN RAISE EXCEPTION 'Cross household roster visible'; END IF;
 BEGIN
  PERFORM app.classify_family_member(g,'father');
  RAISE EXCEPTION 'Child escalation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
 RAISE EXCEPTION USING ERRCODE='P9001',MESSAGE='rollback fixtures';
 EXCEPTION WHEN SQLSTATE 'P9001' THEN NULL;
 END;
END $test$;