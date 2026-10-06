"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { withFamilyContext } from "@/lib/db/context";
import { isRecentPosition, sosLocationSchema } from "@/lib/sos/validation";

type Result = { id?: string; ok?: boolean; error?: string };

export async function startSosAction(message = ""): Promise<Result> {
  const parsed = z.string().trim().max(500).safeParse(message);
  if (!parsed.success) return { error: "The message is too long." };
  const session = await requireSession();
  try {
    const id = await withFamilyContext(session, async (client) => {
      // Serialize repeat taps and retries for this member, without changing other alerts.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`sos:${session.memberId}`]);
      const existing = await client.query(`SELECT id FROM family.sos_alerts
        WHERE household_id = app.household_id() AND member_id = app.member_id()
        AND status = 'active' ORDER BY triggered_at DESC LIMIT 1`);
      if (existing.rows[0]) {
        await client.query(`UPDATE family.sos_alerts SET location_sharing = true
          WHERE id = $1 AND member_id = app.member_id() AND status = 'active'`, [existing.rows[0].id]);
        return existing.rows[0].id as string;
      }
      const result = await client.query(`INSERT INTO family.sos_alerts
        (household_id, member_id, message, location_sharing)
        VALUES (app.household_id(), app.member_id(), nullif($1, ''), true) RETURNING id`, [parsed.data]);
      return result.rows[0].id as string;
    });
    revalidatePath("/dashboard"); revalidatePath("/safety");
    return { id, ok: true };
  } catch { return { error: "SOS could not be sent. Try again or call 112." }; }
}

export async function updateSosLocationAction(input: unknown): Promise<Result> {
  const parsed = sosLocationSchema.safeParse(input);
  if (!parsed.success || !isRecentPosition(parsed.data.capturedAt)) return { error: "A fresh location is not available yet." };
  const session = await requireSession();
  const position = parsed.data;
  try {
    const result = await withFamilyContext(session, (client) => client.query(`
      UPDATE family.sos_alerts SET latitude = $2, longitude = $3, accuracy_m = $4,
        location_updated_at = to_timestamp($5::double precision / 1000)
      WHERE id = $1 AND household_id = app.household_id() AND member_id = app.member_id()
        AND status = 'active' AND location_sharing
        AND (location_updated_at IS NULL OR location_updated_at <= to_timestamp($5::double precision / 1000))
      RETURNING id
    `, [position.alertId, position.latitude, position.longitude, position.accuracy, position.capturedAt]));
    return result.rowCount ? { ok: true } : { error: "Location sharing has stopped. Refresh to check your SOS." };
  } catch { return { error: "Location could not be shared. Your SOS remains active." }; }
}

export async function stopSosAction(id: string, endEmergency: boolean): Promise<Result> {
  if (!z.uuid().safeParse(id).success || typeof endEmergency !== "boolean") return { error: "Invalid SOS alert." };
  const session = await requireSession();
  try {
    const result = await withFamilyContext(session, (client) => client.query(`
      UPDATE family.sos_alerts SET location_sharing = false, latitude = NULL,
        longitude = NULL, accuracy_m = NULL, location_updated_at = NULL,
        status = CASE WHEN $2 THEN 'resolved'::family.sos_status ELSE status END,
        resolved_at = CASE WHEN $2 THEN now() ELSE resolved_at END,
        resolved_by = CASE WHEN $2 THEN app.member_id() ELSE resolved_by END
      WHERE id = $1 AND household_id = app.household_id() AND member_id = app.member_id()
        AND status = 'active' RETURNING id
    `, [id, endEmergency]));
    revalidatePath("/dashboard"); revalidatePath("/safety");
    return result.rowCount ? { ok: true } : { error: "This SOS is no longer active. Refresh the page." };
  } catch { return { error: "The change could not be saved. Please try again." }; }
}
