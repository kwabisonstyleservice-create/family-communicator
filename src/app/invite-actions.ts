"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { withFamilyContext } from "@/lib/db/context";

export type InviteState = { error?: string; success?: string };

export async function replaceFamilyCode(
  _state: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const session = await requireSession();
  if (session.role !== "admin") return { error: "Only the family admin can replace invitation codes." };
  const role = formData.get("role");
  if (role !== "parent" && role !== "child" && role !== "guest") {
    return { error: "Choose Parent, Child, or Guest." };
  }
  if (formData.get("confirm") !== "yes") {
    return { error: "Confirm that the previous code will stop working." };
  }
  try {
    await withFamilyContext(session, async (client) => {
      await client.query("SELECT * FROM app.rotate_admin_join_code($1)", [role]);
    });
  } catch {
    return { error: "The code could not be replaced. Refresh Settings to check the current code before trying again." };
  }
  revalidatePath("/settings");
  return { success: "Your family code has been replaced. Share the new code with your family." };
}
