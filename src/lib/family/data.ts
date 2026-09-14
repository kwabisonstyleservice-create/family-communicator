import type { PoolClient } from "pg";
import type { FamilyPrincipal, FamilyRole } from "@/lib/db/context";
import { withFamilyContext } from "@/lib/db/context";

export type FamilyMember = { id: string; display_name: string; family_role: FamilyRole; family_label: string | null; avatar_url: string | null };
export type FamilyEvent = { id: string; title: string; location: string | null; starts_at: Date; ends_at: Date };
export type FamilyChore = { id: string; title: string; status: "todo" | "in_progress" | "done" | "verified"; points: number; due_date: string | null; assigned_to: string | null; assigned_name: string | null };
export type Announcement = { id: string; title: string; body: string; priority: "normal" | "important" | "urgent"; created_at: Date; creator_name: string | null };
export type CheckIn = { id: string; status: "safe" | "leaving" | "arrived" | "help"; message: string | null; created_at: Date; member_name: string };
export type LocationState = { member_id: string; display_name: string; place_label: string | null; is_sharing: boolean; captured_at: Date | null };
export type SosAlert = { id: string; member_name: string; message: string | null; triggered_at: Date };

export type FamilySnapshot = {
  members: FamilyMember[];
  events: FamilyEvent[];
  chores: FamilyChore[];
  announcements: Announcement[];
  checkIns: CheckIn[];
  locations: LocationState[];
  activeSos: SosAlert[];
  unreadNotifications: number;
};

async function rows<T>(client: PoolClient, query: string, values: unknown[] = []) {
  return (await client.query<T & Record<string, unknown>>(query, values)).rows as T[];
}

export async function getFamilySnapshot(principal: FamilyPrincipal): Promise<FamilySnapshot> {
  return withFamilyContext(principal, async (client, currentRole) => {
    const members = await rows<FamilyMember>(client, `
      SELECT id, display_name, family_role, avatar_url, family_label
      FROM family.v_members_roster
      WHERE household_id = app.household_id() AND is_active
      ORDER BY CASE family_role WHEN 'admin' THEN 1 WHEN 'parent' THEN 2 WHEN 'child' THEN 3 ELSE 4 END, display_name
    `);
    const events = await rows<FamilyEvent>(client, `
      SELECT id, title, location, starts_at, ends_at
      FROM family.v_calendar_public
      WHERE household_id = app.household_id() AND ends_at >= now() - interval '4 hours'
      ORDER BY starts_at LIMIT 12
    `);
    const chores = currentRole === "guest" ? [] : await rows<FamilyChore>(client, `
      SELECT c.id, c.title, c.status, c.points, c.due_date, c.assigned_to, m.display_name AS assigned_name
      FROM family.chores c
      LEFT JOIN family.v_members_roster m ON m.id = c.assigned_to
      WHERE c.household_id = app.household_id()
      ORDER BY CASE c.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'done' THEN 3 ELSE 4 END,
               c.due_date NULLS LAST, c.title LIMIT 24
    `);
    const announcements = await rows<Announcement>(client, `
      SELECT a.id, a.title, a.body, a.priority, a.created_at, m.display_name AS creator_name
      FROM family.announcements a
      LEFT JOIN family.v_members_roster m ON m.id = a.created_by
      WHERE a.household_id = app.household_id()
      ORDER BY (a.pinned_until > now()) DESC, a.created_at DESC LIMIT 8
    `);
    const checkIns = await rows<CheckIn>(client, `
      SELECT c.id, c.status, c.message, c.created_at, m.display_name AS member_name
      FROM family.check_ins c JOIN family.v_members_roster m ON m.id = c.member_id
      WHERE c.household_id = app.household_id()
      ORDER BY c.created_at DESC LIMIT 8
    `);
    const locations = await rows<LocationState>(client, `
      SELECT l.member_id, m.display_name, l.place_label, l.is_sharing, l.captured_at
      FROM family.location_states l JOIN family.v_members_roster m ON m.id = l.member_id
      WHERE l.household_id = app.household_id()
      ORDER BY m.display_name
    `);
    const activeSos = await rows<SosAlert>(client, `
      SELECT s.id, m.display_name AS member_name, s.message, s.triggered_at
      FROM family.sos_alerts s JOIN family.v_members_roster m ON m.id = s.member_id
      WHERE s.household_id = app.household_id() AND s.status = 'active'
      ORDER BY s.triggered_at DESC
    `);
    const unread = await rows<{ count: number }>(client, `
      SELECT count(*)::int AS count FROM family.notifications
      WHERE recipient_member_id = app.member_id() AND read_at IS NULL
    `);
    return { members, events, chores, announcements, checkIns, locations, activeSos, unreadNotifications: unread[0]?.count ?? 0 };
  });
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "F";
}

export function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", day: "numeric", month: "short", ...options }).format(new Date(value));
}

export function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
