import "server-only";
import { cookies } from "next/headers";
import { createTranslator, type Locale } from "./shared";
export async function getLocale(): Promise<Locale> {
  return (await cookies()).get("family-language")?.value === "nl" ? "nl" : "en";
}
export async function getTranslator() {
  return createTranslator(await getLocale());
}
