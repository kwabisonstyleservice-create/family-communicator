import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";

import { getFamilyTheme } from "@/lib/family/appearance";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const theme = await getFamilyTheme(session);
  return <AppShell session={session} themeId={theme.id}>{children}</AppShell>;
}
