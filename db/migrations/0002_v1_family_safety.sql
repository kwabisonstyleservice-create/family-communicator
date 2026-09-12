-- Family Communicator V1: family coordination, location consent, safety and notifications.
-- Apply after the existing security-first family schema.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'family' AND t.typname = 'announcement_priority'
  ) THEN
    CREATE TYPE family.announcement_priority AS ENUM ('normal', 'important', 'urgent');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'family' AND t.typname = 'check_in_status'
  ) THEN
    CREATE TYPE family.check_in_status AS ENUM ('safe', 'leaving', 'arrived', 'help');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'family' AND t.typname = 'sos_status'
  ) THEN
    CREATE TYPE family.sos_status AS ENUM ('active', 'resolved', 'cancelled');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'family' AND t.typname = 'event_response'
  ) THEN
    CREATE TYPE family.event_response AS ENUM ('invited', 'accepted', 'declined', 'maybe');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'members_id_household_key'
      AND conrelid = 'family.members'::regclass
  ) THEN
    ALTER TABLE family.members
      ADD CONSTRAINT members_id_household_key UNIQUE (id, household_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calendar_events_id_household_key'
      AND conrelid = 'family.calendar_events'::regclass
  ) THEN
    ALTER TABLE family.calendar_events
      ADD CONSTRAINT calendar_events_id_household_key UNIQUE (id, household_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS family.member_privacy_settings (
  member_id uuid PRIMARY KEY,
  household_id uuid NOT NULL,
  location_sharing_enabled boolean NOT NULL DEFAULT false,
  location_visibility family.sensitivity NOT NULL DEFAULT 'family',
  arrival_notifications_enabled boolean NOT NULL DEFAULT false,
  show_online_status boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_member_household_fk
    FOREIGN KEY (member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family.location_states (
  member_id uuid PRIMARY KEY,
  household_id uuid NOT NULL,
  latitude numeric(9,6),
  longitude numeric(9,6),
  accuracy_m numeric(8,2),
  place_label text,
  battery_percent smallint,
  visibility family.sensitivity NOT NULL DEFAULT 'family',
  is_sharing boolean NOT NULL DEFAULT false,
  captured_at timestamptz,
  sharing_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT location_member_household_fk
    FOREIGN KEY (member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE,
  CONSTRAINT location_latitude_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT location_longitude_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CONSTRAINT location_accuracy_check CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  CONSTRAINT location_battery_check CHECK (battery_percent IS NULL OR battery_percent BETWEEN 0 AND 100),
  CONSTRAINT location_share_coordinates_check
    CHECK (NOT is_sharing OR (latitude IS NOT NULL AND longitude IS NOT NULL AND captured_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS family.safe_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 100),
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  radius_m integer NOT NULL DEFAULT 150 CHECK (radius_m BETWEEN 25 AND 5000),
  visibility family.sensitivity NOT NULL DEFAULT 'family',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safe_place_creator_household_fk
    FOREIGN KEY (created_by, household_id)
    REFERENCES family.members (id, household_id),
  CONSTRAINT safe_places_id_household_key UNIQUE (id, household_id)
);

CREATE TABLE IF NOT EXISTS family.safe_place_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  safe_place_id uuid NOT NULL,
  tracked_member_id uuid NOT NULL,
  recipient_member_id uuid NOT NULL,
  created_by uuid NOT NULL,
  notify_on_arrival boolean NOT NULL DEFAULT true,
  notify_on_departure boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safe_alert_place_household_fk
    FOREIGN KEY (safe_place_id, household_id)
    REFERENCES family.safe_places (id, household_id) ON DELETE CASCADE,
  CONSTRAINT safe_alert_tracked_household_fk
    FOREIGN KEY (tracked_member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE,
  CONSTRAINT safe_alert_recipient_household_fk
    FOREIGN KEY (recipient_member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE,
  CONSTRAINT safe_alert_creator_household_fk
    FOREIGN KEY (created_by, household_id)
    REFERENCES family.members (id, household_id),
  CONSTRAINT safe_place_alert_unique
    UNIQUE (safe_place_id, tracked_member_id, recipient_member_id)
);

CREATE TABLE IF NOT EXISTS family.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  status family.check_in_status NOT NULL DEFAULT 'safe',
  message text CHECK (message IS NULL OR length(message) <= 500),
  latitude numeric(9,6) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  accuracy_m numeric(8,2) CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  visibility family.sensitivity NOT NULL DEFAULT 'family',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_in_member_household_fk
    FOREIGN KEY (member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE,
  CONSTRAINT check_in_coordinate_pair
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE TABLE IF NOT EXISTS family.sos_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  status family.sos_status NOT NULL DEFAULT 'active',
  message text CHECK (message IS NULL OR length(message) <= 500),
  latitude numeric(9,6) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  accuracy_m numeric(8,2) CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  CONSTRAINT sos_member_household_fk
    FOREIGN KEY (member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE,
  CONSTRAINT sos_resolver_household_fk
    FOREIGN KEY (resolved_by, household_id)
    REFERENCES family.members (id, household_id),
  CONSTRAINT sos_coordinate_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT sos_resolution_check CHECK (
    (status = 'active' AND resolved_at IS NULL AND resolved_by IS NULL)
    OR (status <> 'active' AND resolved_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS family.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  owner_member_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  relationship text CHECK (relationship IS NULL OR length(relationship) <= 80),
  phone text NOT NULL CHECK (length(btrim(phone)) BETWEEN 6 AND 40),
  email text CHECK (email IS NULL OR email ~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'),
  priority smallint NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 9),
  visible_to_children boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT emergency_owner_household_fk
    FOREIGN KEY (owner_member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 160),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  priority family.announcement_priority NOT NULL DEFAULT 'normal',
  visibility family.sensitivity NOT NULL DEFAULT 'family',
  pinned_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcement_creator_household_fk
    FOREIGN KEY (created_by, household_id)
    REFERENCES family.members (id, household_id)
);

CREATE TABLE IF NOT EXISTS family.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  recipient_member_id uuid NOT NULL,
  notification_type text NOT NULL CHECK (length(btrim(notification_type)) BETWEEN 2 AND 80),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  body text CHECK (body IS NULL OR length(body) <= 1000),
  entity_type text CHECK (entity_type IS NULL OR length(entity_type) <= 80),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_recipient_household_fk
    FOREIGN KEY (recipient_member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family.device_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES family.households(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  device_label text CHECK (device_label IS NULL OR length(device_label) <= 120),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_member_household_fk
    FOREIGN KEY (member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE,
  CONSTRAINT device_endpoint_key UNIQUE (endpoint)
);

CREATE TABLE IF NOT EXISTS family.calendar_event_members (
  event_id uuid NOT NULL,
  household_id uuid NOT NULL,
  member_id uuid NOT NULL,
  response family.event_response NOT NULL DEFAULT 'invited',
  responsibility text CHECK (responsibility IS NULL OR length(responsibility) <= 240),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id),
  CONSTRAINT event_member_event_household_fk
    FOREIGN KEY (event_id, household_id)
    REFERENCES family.calendar_events (id, household_id) ON DELETE CASCADE,
  CONSTRAINT event_member_member_household_fk
    FOREIGN KEY (member_id, household_id)
    REFERENCES family.members (id, household_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS location_household_shared_idx
  ON family.location_states (household_id, is_sharing, captured_at DESC);
CREATE INDEX IF NOT EXISTS safe_places_household_idx
  ON family.safe_places (household_id, is_active);
CREATE INDEX IF NOT EXISTS safe_alerts_tracked_idx
  ON family.safe_place_alerts (household_id, tracked_member_id) WHERE is_enabled;
CREATE INDEX IF NOT EXISTS check_ins_household_time_idx
  ON family.check_ins (household_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sos_household_active_idx
  ON family.sos_alerts (household_id, triggered_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS emergency_contacts_owner_idx
  ON family.emergency_contacts (household_id, owner_member_id, priority);
CREATE INDEX IF NOT EXISTS announcements_household_time_idx
  ON family.announcements (household_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON family.notifications (recipient_member_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS devices_member_active_idx
  ON family.device_subscriptions (member_id, last_seen_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS event_members_member_idx
  ON family.calendar_event_members (household_id, member_id);

ALTER TABLE family.member_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.member_privacy_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE family.location_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.location_states FORCE ROW LEVEL SECURITY;
ALTER TABLE family.safe_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.safe_places FORCE ROW LEVEL SECURITY;
ALTER TABLE family.safe_place_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.safe_place_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE family.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.check_ins FORCE ROW LEVEL SECURITY;
ALTER TABLE family.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.sos_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE family.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.emergency_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE family.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.announcements FORCE ROW LEVEL SECURITY;
ALTER TABLE family.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE family.device_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.device_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE family.calendar_event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family.calendar_event_members FORCE ROW LEVEL SECURITY;

-- PostgreSQL requires the target owner to have CREATE on the containing schema.
-- The privilege exists only for this transaction and is revoked before commit.
GRANT CREATE ON SCHEMA app, family TO family_security;

CREATE OR REPLACE FUNCTION app.member_is_child(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, family
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family.members m
    WHERE m.id = p_member_id
      AND m.household_id = app.household_id()
      AND m.family_role = 'child'
      AND m.is_active
  );
$$;

REVOKE ALL ON FUNCTION app.member_is_child(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.member_is_child(uuid) TO family_admin, family_parent;
ALTER FUNCTION app.member_is_child(uuid) OWNER TO family_security;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'member_privacy_settings','location_states','safe_places','safe_place_alerts',
    'check_ins','sos_alerts','emergency_contacts','announcements','notifications',
    'device_subscriptions','calendar_event_members'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY rst_context_required ON family.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (app.member_id() IS NOT NULL AND app.family_role() IS NOT NULL) WITH CHECK (app.member_id() IS NOT NULL AND app.family_role() IS NOT NULL)',
      t
    );
    EXECUTE format(
      'CREATE POLICY rst_household_isolation ON family.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (household_id = app.household_id()) WITH CHECK (household_id = app.household_id())',
      t
    );
  END LOOP;
END $$;

CREATE POLICY privacy_self_all ON family.member_privacy_settings
  FOR ALL TO family_admin, family_parent, family_child, family_guest
  USING (member_id = app.member_id())
  WITH CHECK (member_id = app.member_id());
CREATE POLICY privacy_admin_read ON family.member_privacy_settings
  FOR SELECT TO family_admin USING (app.family_role() = 'admin');
CREATE POLICY privacy_parent_child_read ON family.member_privacy_settings
  FOR SELECT TO family_parent USING (
    app.family_role() = 'parent' AND app.member_is_child(member_id)
  );
CREATE POLICY privacy_parent_child_update ON family.member_privacy_settings
  FOR UPDATE TO family_parent USING (
    app.family_role() = 'parent' AND app.member_is_child(member_id)
  ) WITH CHECK (
    app.family_role() = 'parent' AND app.member_is_child(member_id)
  );

CREATE POLICY location_self_all ON family.location_states
  FOR ALL TO family_admin, family_parent, family_child, family_guest
  USING (member_id = app.member_id())
  WITH CHECK (member_id = app.member_id());
CREATE POLICY location_parental_shared_read ON family.location_states
  FOR SELECT TO family_admin, family_parent USING (
    app.is_parental() AND is_sharing
    AND (sharing_until IS NULL OR sharing_until > now())
    AND visibility IN ('public','family','parents')
  );
CREATE POLICY location_child_shared_read ON family.location_states
  FOR SELECT TO family_child USING (
    app.family_role() = 'child' AND is_sharing
    AND (sharing_until IS NULL OR sharing_until > now())
    AND visibility IN ('public','family')
  );
CREATE POLICY location_guest_shared_read ON family.location_states
  FOR SELECT TO family_guest USING (
    app.family_role() = 'guest' AND is_sharing
    AND (sharing_until IS NULL OR sharing_until > now())
    AND visibility = 'public'
  );

CREATE POLICY safe_places_parental_all ON family.safe_places
  FOR ALL TO family_admin, family_parent
  USING (app.is_parental()) WITH CHECK (app.is_parental());
CREATE POLICY safe_places_child_read ON family.safe_places
  FOR SELECT TO family_child
  USING (app.family_role() = 'child' AND is_active AND visibility IN ('public','family'));
CREATE POLICY safe_places_guest_read ON family.safe_places
  FOR SELECT TO family_guest
  USING (app.family_role() = 'guest' AND is_active AND visibility = 'public');

CREATE POLICY safe_alerts_parental_all ON family.safe_place_alerts
  FOR ALL TO family_admin, family_parent
  USING (app.is_parental()) WITH CHECK (app.is_parental());
CREATE POLICY safe_alerts_member_read ON family.safe_place_alerts
  FOR SELECT TO family_child, family_guest
  USING (tracked_member_id = app.member_id() OR recipient_member_id = app.member_id());

CREATE POLICY check_ins_self_insert ON family.check_ins
  FOR INSERT TO family_admin, family_parent, family_child, family_guest
  WITH CHECK (member_id = app.member_id());
CREATE POLICY check_ins_self_read ON family.check_ins
  FOR SELECT TO family_admin, family_parent, family_child, family_guest
  USING (member_id = app.member_id());
CREATE POLICY check_ins_parental_read ON family.check_ins
  FOR SELECT TO family_admin, family_parent USING (app.is_parental());
CREATE POLICY check_ins_child_read ON family.check_ins
  FOR SELECT TO family_child
  USING (app.family_role() = 'child' AND visibility IN ('public','family'));
CREATE POLICY check_ins_guest_read ON family.check_ins
  FOR SELECT TO family_guest
  USING (app.family_role() = 'guest' AND visibility = 'public');
CREATE POLICY check_ins_admin_delete ON family.check_ins
  FOR DELETE TO family_admin USING (app.family_role() = 'admin');

CREATE POLICY sos_self_insert ON family.sos_alerts
  FOR INSERT TO family_admin, family_parent, family_child, family_guest
  WITH CHECK (member_id = app.member_id() AND status = 'active');
CREATE POLICY sos_self_read ON family.sos_alerts
  FOR SELECT TO family_admin, family_parent, family_child, family_guest
  USING (member_id = app.member_id());
CREATE POLICY sos_parental_all ON family.sos_alerts
  FOR ALL TO family_admin, family_parent
  USING (app.is_parental()) WITH CHECK (app.is_parental());

CREATE POLICY emergency_self_all ON family.emergency_contacts
  FOR ALL TO family_admin, family_parent, family_child
  USING (owner_member_id = app.member_id())
  WITH CHECK (owner_member_id = app.member_id());
CREATE POLICY emergency_admin_all ON family.emergency_contacts
  FOR ALL TO family_admin
  USING (app.family_role() = 'admin') WITH CHECK (app.family_role() = 'admin');
CREATE POLICY emergency_parent_child_all ON family.emergency_contacts
  FOR ALL TO family_parent USING (
    app.family_role() = 'parent' AND app.member_is_child(owner_member_id)
  ) WITH CHECK (
    app.family_role() = 'parent' AND app.member_is_child(owner_member_id)
  );
CREATE POLICY emergency_child_visible_read ON family.emergency_contacts
  FOR SELECT TO family_child
  USING (app.family_role() = 'child' AND visible_to_children);

CREATE POLICY announcements_parental_all ON family.announcements
  FOR ALL TO family_admin, family_parent
  USING (app.is_parental()) WITH CHECK (app.is_parental());
CREATE POLICY announcements_child_read ON family.announcements
  FOR SELECT TO family_child
  USING (app.family_role() = 'child' AND visibility IN ('public','family'));
CREATE POLICY announcements_guest_read ON family.announcements
  FOR SELECT TO family_guest
  USING (app.family_role() = 'guest' AND visibility = 'public');

CREATE POLICY notifications_self_read ON family.notifications
  FOR SELECT TO family_admin, family_parent, family_child, family_guest
  USING (recipient_member_id = app.member_id());
CREATE POLICY notifications_self_update ON family.notifications
  FOR UPDATE TO family_admin, family_parent, family_child, family_guest
  USING (recipient_member_id = app.member_id())
  WITH CHECK (recipient_member_id = app.member_id());
CREATE POLICY notifications_self_delete ON family.notifications
  FOR DELETE TO family_admin, family_parent, family_child, family_guest
  USING (recipient_member_id = app.member_id());
CREATE POLICY notifications_parental_insert ON family.notifications
  FOR INSERT TO family_admin, family_parent WITH CHECK (app.is_parental());

CREATE POLICY devices_self_all ON family.device_subscriptions
  FOR ALL TO family_admin, family_parent, family_child, family_guest
  USING (member_id = app.member_id())
  WITH CHECK (member_id = app.member_id());

CREATE POLICY event_members_parental_all ON family.calendar_event_members
  FOR ALL TO family_admin, family_parent
  USING (app.is_parental()) WITH CHECK (app.is_parental());
CREATE POLICY event_members_self_read ON family.calendar_event_members
  FOR SELECT TO family_child, family_guest
  USING (member_id = app.member_id());
CREATE POLICY event_members_self_update ON family.calendar_event_members
  FOR UPDATE TO family_child, family_guest
  USING (member_id = app.member_id())
  WITH CHECK (member_id = app.member_id());

REVOKE ALL ON family.member_privacy_settings, family.location_states, family.safe_places,
  family.safe_place_alerts, family.check_ins, family.sos_alerts, family.emergency_contacts,
  family.announcements, family.notifications, family.device_subscriptions,
  family.calendar_event_members FROM PUBLIC;

GRANT USAGE ON SCHEMA family, app TO family_admin, family_parent, family_child, family_guest;
GRANT USAGE ON TYPE family.announcement_priority, family.check_in_status,
  family.sos_status, family.event_response TO family_admin, family_parent, family_child, family_guest;

GRANT SELECT, INSERT, UPDATE, DELETE ON family.member_privacy_settings,
  family.location_states, family.device_subscriptions TO family_admin, family_parent, family_child, family_guest;
GRANT SELECT, INSERT, UPDATE, DELETE ON family.safe_places, family.safe_place_alerts,
  family.sos_alerts, family.emergency_contacts, family.calendar_event_members TO family_admin, family_parent;
GRANT SELECT ON family.safe_places, family.safe_place_alerts, family.emergency_contacts,
  family.calendar_event_members TO family_child, family_guest;
GRANT UPDATE ON family.calendar_event_members TO family_child, family_guest;
GRANT SELECT, INSERT, DELETE ON family.check_ins TO family_admin, family_parent, family_child, family_guest;
GRANT SELECT, INSERT, UPDATE, DELETE ON family.announcements TO family_admin, family_parent;
GRANT SELECT ON family.announcements TO family_child, family_guest;
GRANT SELECT, UPDATE, DELETE ON family.notifications TO family_admin, family_parent, family_child, family_guest;
GRANT INSERT ON family.notifications TO family_admin, family_parent;

CREATE OR REPLACE FUNCTION family.audit_is_sensitive(p_table text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path TO pg_catalog
AS $$
  SELECT p_table IN (
    'members','health_records','finance_accounts','documents','household_invite',
    'member_privacy_settings','location_states','safe_places','safe_place_alerts',
    'check_ins','sos_alerts','emergency_contacts','announcements','notifications',
    'device_subscriptions','calendar_event_members'
  );
$$;

CREATE OR REPLACE FUNCTION family.tg_member_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, family
AS $$
BEGIN
  INSERT INTO family.member_privacy_settings (member_id, household_id)
  VALUES (NEW.id, NEW.household_id)
  ON CONFLICT (member_id) DO NOTHING;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION family.tg_member_defaults() FROM PUBLIC;
ALTER FUNCTION family.tg_member_defaults() OWNER TO family_security;

DROP TRIGGER IF EXISTS trg_member_defaults ON family.members;
CREATE TRIGGER trg_member_defaults
AFTER INSERT ON family.members
FOR EACH ROW EXECUTE FUNCTION family.tg_member_defaults();

CREATE OR REPLACE FUNCTION app.lookup_principal(p_auth_subject text)
RETURNS TABLE(member_id uuid, household_id uuid, family_role text, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, family
AS $$
  SELECT m.id, m.household_id, m.family_role::text, m.display_name
  FROM family.members m
  JOIN family.households h ON h.id = m.household_id
  WHERE m.auth_subject = p_auth_subject AND m.is_active AND h.is_active;
$$;

CREATE OR REPLACE FUNCTION app.create_household(
  p_auth_subject text,
  p_display_name text,
  p_email text,
  p_household_name text
)
RETURNS TABLE(member_id uuid, household_id uuid, family_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, family
AS $$
DECLARE
  v_household uuid;
  v_member uuid;
BEGIN
  IF length(btrim(coalesce(p_auth_subject, ''))) < 3
     OR length(btrim(coalesce(p_display_name, ''))) NOT BETWEEN 2 AND 100
     OR length(btrim(coalesce(p_household_name, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Invalid household registration details' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM family.members m WHERE m.auth_subject = p_auth_subject) THEN
    RAISE EXCEPTION 'Account already belongs to a household' USING ERRCODE = '23505';
  END IF;

  INSERT INTO family.households (name)
  VALUES (btrim(p_household_name))
  RETURNING id INTO v_household;

  INSERT INTO family.members (household_id, auth_subject, display_name, family_role, email)
  VALUES (v_household, p_auth_subject, btrim(p_display_name), 'admin', nullif(lower(btrim(p_email)), ''))
  RETURNING id INTO v_member;

  RETURN QUERY SELECT v_member, v_household, 'admin'::text;
END $$;

CREATE OR REPLACE FUNCTION app.join_household(
  p_auth_subject text,
  p_display_name text,
  p_email text,
  p_code text
)
RETURNS TABLE(member_id uuid, household_id uuid, family_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, family
AS $$
DECLARE
  v_invite_id uuid;
  v_household uuid;
  v_role family.family_role;
  v_member uuid;
BEGIN
  IF length(btrim(coalesce(p_auth_subject, ''))) < 3
     OR length(btrim(coalesce(p_display_name, ''))) NOT BETWEEN 2 AND 100
     OR length(btrim(coalesce(p_code, ''))) < 6 THEN
    RAISE EXCEPTION 'Invalid invitation details' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM family.members m WHERE m.auth_subject = p_auth_subject) THEN
    RAISE EXCEPTION 'Account already belongs to a household' USING ERRCODE = '23505';
  END IF;

  SELECT i.id, i.household_id, i.invited_role
  INTO v_invite_id, v_household, v_role
  FROM family.household_invite i
  JOIN family.households h ON h.id = i.household_id
  WHERE upper(btrim(i.code)) = upper(btrim(p_code))
    AND i.revoked_at IS NULL
    AND (i.expires_at IS NULL OR i.expires_at > now())
    AND (i.max_uses IS NULL OR i.uses < i.max_uses)
    AND h.is_active
  FOR UPDATE OF i;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation is invalid or expired' USING ERRCODE = '28000';
  END IF;

  INSERT INTO family.members (household_id, auth_subject, display_name, family_role, email)
  VALUES (v_household, p_auth_subject, btrim(p_display_name), v_role, nullif(lower(btrim(p_email)), ''))
  RETURNING id INTO v_member;

  UPDATE family.household_invite SET uses = uses + 1 WHERE id = v_invite_id;

  RETURN QUERY SELECT v_member, v_household, v_role::text;
END $$;

REVOKE ALL ON FUNCTION app.lookup_principal(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.create_household(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.join_household(text,text,text,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.lookup_principal(text) TO thuis_runtime;
GRANT EXECUTE ON FUNCTION app.create_household(text,text,text,text) TO thuis_runtime;
GRANT EXECUTE ON FUNCTION app.join_household(text,text,text,text) TO thuis_runtime;

ALTER FUNCTION app.lookup_principal(text) OWNER TO family_security;
ALTER FUNCTION app.create_household(text,text,text,text) OWNER TO family_security;
ALTER FUNCTION app.join_household(text,text,text,text) OWNER TO family_security;

GRANT family_admin, family_parent, family_child, family_guest TO thuis_runtime;
GRANT USAGE ON SCHEMA app TO thuis_runtime;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'member_privacy_settings','safe_places','safe_place_alerts','check_ins',
    'sos_alerts','emergency_contacts','announcements','calendar_event_members'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON family.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON family.%I FOR EACH ROW EXECUTE FUNCTION family.tg_audit()',
      t
    );
  END LOOP;
END $$;

ALTER TABLE family.member_privacy_settings OWNER TO family_owner;
ALTER TABLE family.location_states OWNER TO family_owner;
ALTER TABLE family.safe_places OWNER TO family_owner;
ALTER TABLE family.safe_place_alerts OWNER TO family_owner;
ALTER TABLE family.check_ins OWNER TO family_owner;
ALTER TABLE family.sos_alerts OWNER TO family_owner;
ALTER TABLE family.emergency_contacts OWNER TO family_owner;
ALTER TABLE family.announcements OWNER TO family_owner;
ALTER TABLE family.notifications OWNER TO family_owner;
ALTER TABLE family.device_subscriptions OWNER TO family_owner;
ALTER TABLE family.calendar_event_members OWNER TO family_owner;

ALTER TYPE family.announcement_priority OWNER TO family_owner;
ALTER TYPE family.check_in_status OWNER TO family_owner;
ALTER TYPE family.sos_status OWNER TO family_owner;
ALTER TYPE family.event_response OWNER TO family_owner;

REVOKE CREATE ON SCHEMA app, family FROM family_security;

COMMIT;
