import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: { default: "Family Communicator — Your family, connected", template: "%s · Family Communicator" },
  description: "A calm, private home base for your family.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body><LanguageProvider locale={locale}>{children}</LanguageProvider></body>
    </html>
  );
}
