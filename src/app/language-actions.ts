"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./actions";
export async function saveLanguageAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const locale = data.get("locale");
  if (locale !== "en" && locale !== "nl") return { error: "Choose English or Dutch." };
  (await cookies()).set("family-language", locale, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
