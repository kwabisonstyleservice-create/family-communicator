import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Family Communicator — Your family, connected", template: "%s · Family Communicator" },
  description: "A calm, private home base for your family.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
