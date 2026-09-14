"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { withFamilyContext } from "@/lib/db/context";
import type { ActionState } from "@/app/actions";

export async function classifyMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.role !== "admin") return { error: "Only the family admin can classify members." };
  const parsed = z.object({
    memberId: z.uuid(),
    label: z.enum(["guest", "son", "daughter", "mother", "father"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a member and a valid classification." };
  try {
    await withFamilyContext(session, async (client) => {
      await client.query("SELECT app.classify_family_member($1::uuid, $2)", [parsed.data.memberId, parsed.data.label]);
    });
  } catch {
    return { error: "The classification could not be saved. Refresh the page and try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
