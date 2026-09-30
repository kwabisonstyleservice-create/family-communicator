"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/app/actions";
import { requireSession } from "@/lib/auth/session";
import { withFamilyContext } from "@/lib/db/context";

const messageSchema = z.object({
  body: z.string().trim().min(1, "Write a message first.").max(1000, "Keep your message under 1,000 characters."),
});

export async function sendFamilyMessageAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your message." };

  const session = await requireSession();
  try {
    await withFamilyContext(session, (client) => client.query(`
      INSERT INTO family.chat_messages (household_id, sender_id, body)
      VALUES (app.household_id(), app.member_id(), $1)
    `, [parsed.data.body]));
  } catch {
    return { error: "Your message could not be sent. Please try again." };
  }

  revalidatePath("/chat");
  return { ok: true };
}
