"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/app/actions";
import { requireSession } from "@/lib/auth/session";
import { withFamilyContext } from "@/lib/db/context";
import { gratitudeEntrySchema } from "@/lib/gratitude/validation";

export async function createGratitudeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = gratitudeEntrySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your gratitude entry." };

  const session = await requireSession();
  try {
    const inserted = await withFamilyContext(session, (client) => client.query<{ id: string }>(`
      WITH next_slot AS (
        SELECT slot::smallint AS slot
        FROM generate_series(1, 2) AS slot
        WHERE NOT EXISTS (
          SELECT 1
          FROM family.gratitude_entries
          WHERE household_id = app.household_id()
            AND member_id = app.member_id()
            AND gratitude_date = (now() AT TIME ZONE 'Europe/Amsterdam')::date
            AND entry_slot = slot
        )
        ORDER BY slot
        LIMIT 1
      )
      INSERT INTO family.gratitude_entries
        (household_id, member_id, body, gratitude_date, entry_slot)
      SELECT app.household_id(), app.member_id(), $1,
             (now() AT TIME ZONE 'Europe/Amsterdam')::date, next_slot.slot
      FROM next_slot
      RETURNING id
    `, [parsed.data.body]));

    if (!inserted.rowCount) return { error: "You have already shared two things today. Come back tomorrow." };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { error: "You have already shared two things today. Come back tomorrow." };
    }
    return { error: "Your gratitude entry could not be shared. Please try again." };
  }

  revalidatePath("/gratitude");
  revalidatePath("/dashboard");
  return { ok: true };
}
