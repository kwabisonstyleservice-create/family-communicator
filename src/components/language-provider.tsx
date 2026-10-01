"use client";
import { createContext, useContext } from "react";
import { createTranslator, type Locale } from "@/lib/i18n/shared";
const LanguageContext = createContext<Locale>("en");
export function LanguageProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>;
}
export function useTranslations() {
  return createTranslator(useContext(LanguageContext));
}
