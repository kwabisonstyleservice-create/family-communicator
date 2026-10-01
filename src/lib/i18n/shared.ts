import dutch from "./nl.json" with { type: "json" };
export type Locale = "en" | "nl";
export function createTranslator(locale: Locale) {
  const t = (text: string) => locale === "nl" ? (dutch as Record<string, string>)[text] ?? text : text;
  return Object.assign(t, { locale });
}
