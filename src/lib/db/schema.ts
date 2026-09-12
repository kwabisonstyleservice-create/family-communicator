import {
  boolean,
  char,
  date,
  integer,
  numeric,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const family = pgSchema("family");

export const familyRole = family.enum("family_role", ["admin", "parent", "child", "guest"]);
export const sensitivity = family.enum("sensitivity", ["public", "family", "parents", "private"]);
export const choreStatus = family.enum("chore_status", ["todo", "in_progress", "done", "verified"]);
export const announcementPriority = family.enum("announcement_priority", ["normal", "important", "urgent"]);
export const checkInStatus = family.enum("check_in_status", ["safe", "leaving", "arrived", "help"]);
export const sosStatus = family.enum("sos_status", ["active", "resolved", "cancelled"]);
export const eventResponse = family.enum("event_response", ["invited", "accepted", "declined", "maybe"]);

export const households = family.table("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  countryCode: char("country_code", { length: 2 }).notNull().default("NL"),
  timezone: text("timezone").notNull().default("Europe/Amsterdam"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = family.table(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id").notNull().references(() => households.id),
    authSubject: text("auth_subject").notNull().unique(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    role: familyRole("family_role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    email: text("email"),
    phone: text("phone"),
    dateOfBirth: date("date_of_birth"),
    nationalIdLast4: char("national_id_last4", { length: 4 }),
    guardianNotes: text("guardian_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("members_id_household_key").on(table.id, table.householdId)],
);

export const calendarEvents = family.table(
  "calendar_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id").notNull().references(() => households.id),
    createdBy: uuid("created_by").notNull().references(() => members.id),
    title: text("title").notNull(),
    location: text("location"),
    visibility: sensitivity("visibility").notNull().default("family"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    privateNote: text("private_note"),
  },
  (table) => [unique("calendar_events_id_household_key").on(table.id, table.householdId)],
);

export const chores = family.table("chores", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id),
  assignedTo: uuid("assigned_to").references(() => members.id),
  title: text("title").notNull(),
  points: integer("points").notNull().default(0),
  dueDate: date("due_date"),
  status: choreStatus("status").notNull().default("todo"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => members.id),
});

export const memberPrivacySettings = family.table("member_privacy_settings", {
  memberId: uuid("member_id").primaryKey().references(() => members.id),
  householdId: uuid("household_id").notNull().references(() => households.id),
  locationSharingEnabled: boolean("location_sharing_enabled").notNull().default(false),
  locationVisibility: sensitivity("location_visibility").notNull().default("family"),
  arrivalNotificationsEnabled: boolean("arrival_notifications_enabled").notNull().default(false),
  showOnlineStatus: boolean("show_online_status").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const locationStates = family.table("location_states", {
  memberId: uuid("member_id").primaryKey().references(() => members.id),
  householdId: uuid("household_id").notNull().references(() => households.id),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  accuracyM: numeric("accuracy_m", { precision: 8, scale: 2 }),
  placeLabel: text("place_label"),
  batteryPercent: smallint("battery_percent"),
  visibility: sensitivity("visibility").notNull().default("family"),
  isSharing: boolean("is_sharing").notNull().default(false),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
  sharingUntil: timestamp("sharing_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcements = family.table("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id),
  createdBy: uuid("created_by").notNull().references(() => members.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: announcementPriority("priority").notNull().default("normal"),
  visibility: sensitivity("visibility").notNull().default("family"),
  pinnedUntil: timestamp("pinned_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const checkIns = family.table("check_ins", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id),
  memberId: uuid("member_id").notNull().references(() => members.id),
  status: checkInStatus("status").notNull().default("safe"),
  message: text("message"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  accuracyM: numeric("accuracy_m", { precision: 8, scale: 2 }),
  visibility: sensitivity("visibility").notNull().default("family"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sosAlerts = family.table("sos_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id),
  memberId: uuid("member_id").notNull().references(() => members.id),
  status: sosStatus("status").notNull().default("active"),
  message: text("message"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  accuracyM: numeric("accuracy_m", { precision: 8, scale: 2 }),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by").references(() => members.id),
});

export const calendarEventMembers = family.table(
  "calendar_event_members",
  {
    eventId: uuid("event_id").notNull().references(() => calendarEvents.id),
    householdId: uuid("household_id").notNull().references(() => households.id),
    memberId: uuid("member_id").notNull().references(() => members.id),
    response: eventResponse("response").notNull().default("invited"),
    responsibility: text("responsibility"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.memberId] })],
);
