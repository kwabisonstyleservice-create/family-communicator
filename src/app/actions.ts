"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSession, requireSession } from "@/lib/auth/session";
import { withFamilyContext } from "@/lib/db/context";

export type ActionState = { ok?: boolean; error?: string };

const text = (maximum: number) => z.string().trim().min(1).max(maximum);

export async function signOutAction() {
  await clearSession();
  redirect("/");
}

export async function checkInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ status: z.enum(["safe", "leaving", "arrived", "help"]), message: z.string().trim().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a valid check-in." };
  const session = await requireSession();
  try {
    await withFamilyContext(session, (client) => client.query(`
      INSERT INTO family.check_ins (household_id, member_id, status, message)
      VALUES (app.household_id(), app.member_id(), $1, nullif($2, ''))
    `, [parsed.data.status, parsed.data.message ?? ""]));
  } catch { return { error: "Your check-in could not be shared." }; }
  revalidatePath("/dashboard"); revalidatePath("/safety");
  return { ok: true };
}

export async function sosAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ message: z.string().trim().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "The message is too long." };
  const session = await requireSession();
  try {
    await withFamilyContext(session, (client) => client.query(`
      INSERT INTO family.sos_alerts (household_id, member_id, message)
      VALUES (app.household_id(), app.member_id(), nullif($1, ''))
    `, [parsed.data.message ?? ""]));
  } catch { return { error: "The SOS alert could not be sent. Call 112 if there is immediate danger." }; }
  revalidatePath("/dashboard"); revalidatePath("/safety");
  return { ok: true };
}

export async function createChoreAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ title: text(160), assignedTo: z.uuid().optional().or(z.literal("")), dueDate: z.iso.date().optional().or(z.literal("")), points: z.coerce.number().int().min(0).max(1000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the task details." };
  const session = await requireSession();
  if (!['admin', 'parent'].includes(session.role)) return { error: "Only parents and family admins can add tasks." };
  try {
    await withFamilyContext(session, (client) => client.query(`
      INSERT INTO family.chores (household_id, assigned_to, title, points, due_date)
      VALUES (app.household_id(), nullif($1, '')::uuid, $2, $3, nullif($4, '')::date)
    `, [parsed.data.assignedTo ?? "", parsed.data.title, parsed.data.points, parsed.data.dueDate ?? ""]));
  } catch { return { error: "This task could not be added." }; }
  revalidatePath("/dashboard"); revalidatePath("/tasks");
  return { ok: true };
}

export async function completeChoreAction(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const session = await requireSession();
  await withFamilyContext(session, (client) => client.query(`
    UPDATE family.chores SET status = 'done', completed_at = now()
    WHERE id = $1 AND household_id = app.household_id() AND status IN ('todo', 'in_progress')
  `, [id.data]));
  revalidatePath("/dashboard"); revalidatePath("/tasks");
}

export async function createEventAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ title: text(180), location: z.string().trim().max(240).optional(), startsAt: z.string().datetime({ local: true }), endsAt: z.string().datetime({ local: true }) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the event details and times." };
  const session = await requireSession();
  if (!['admin', 'parent'].includes(session.role)) return { error: "Only parents and family admins can add events." };
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) return { error: "The end time must be after the start." };
  try {
    await withFamilyContext(session, (client) => client.query(`
      INSERT INTO family.calendar_events (household_id, created_by, title, location, starts_at, ends_at)
      VALUES (app.household_id(), app.member_id(), $1, nullif($2, ''), $3::timestamptz, $4::timestamptz)
    `, [parsed.data.title, parsed.data.location ?? "", parsed.data.startsAt, parsed.data.endsAt]));
  } catch { return { error: "This event could not be added." }; }
  revalidatePath("/dashboard"); revalidatePath("/calendar");
  return { ok: true };
}

export async function createAnnouncementAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ title: text(160), body: text(4000), priority: z.enum(["normal", "important", "urgent"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the announcement." };
  const session = await requireSession();
  if (!['admin', 'parent'].includes(session.role)) return { error: "Only parents and family admins can post updates." };
  try {
    await withFamilyContext(session, (client) => client.query(`
      INSERT INTO family.announcements (household_id, created_by, title, body, priority)
      VALUES (app.household_id(), app.member_id(), $1, $2, $3)
    `, [parsed.data.title, parsed.data.body, parsed.data.priority]));
  } catch { return { error: "This update could not be posted." }; }
  revalidatePath("/dashboard"); revalidatePath("/family");
  return { ok: true };
}
