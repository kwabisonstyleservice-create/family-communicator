"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/app/actions";
import { requireSession } from "@/lib/auth/session";
import { withFamilyContext } from "@/lib/db/context";
import { findFamilyTheme } from "@/lib/family/themes";

export async function saveFamilyThemeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const theme = findFamilyTheme(formData.get("theme"));
  if (!theme) return { error: "Choose one of the family colours." };
  const session = await requireSession();
  try {
    await withFamilyContext(session, async (client, role) => {
      if (role !== "admin") throw new Error("Admin access required");
      await client.query(`
        INSERT INTO family.appearance_settings (household_id, theme)
        VALUES (app.household_id(), $1)
        ON CONFLICT (household_id) DO UPDATE SET theme = EXCLUDED.theme
      `, [theme.id]);
    });
  } catch {
    return { error: "Only the family admin can save the theme. Please refresh and try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
