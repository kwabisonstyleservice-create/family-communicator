import { LanguagePicker } from "@/components/language-picker";
import { getTranslator } from "@/lib/i18n/server";
import { Bell, Database, LockKeyhole, MapPin, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";

import { withFamilyContext } from "@/lib/db/context";
import { FamilyInviteCard, type FamilyInvite } from "@/components/family-invite-card";

import { FamilyThemeCard } from "@/components/family-theme-card";
import { getFamilyTheme } from "@/lib/family/appearance";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Settings") };
}

export default async function SettingsPage() {
  const t = await getTranslator();
  const session = await requireSession();
  const theme = await getFamilyTheme(session);
  let invite: FamilyInvite | null = null;
  if (session.role === "admin") {
    try {
      invite = await withFamilyContext(session, async (client) => {
        const result = await client.query<FamilyInvite>("SELECT code, invited_role, uses FROM app.get_admin_join_code()");
        return result.rows[0] ?? null;
      });
    } catch {
      // Keep the rest of Settings usable when invitation storage is unavailable.
    }
  }
  return <><PageHeader title={t("Settings")} intro={t("Your profile, family privacy, and how Family Communicator reaches you.")} />
    <div className="content-grid"><div className="stack"><LanguagePicker /><FamilyThemeCard current={theme.id} canEdit={session.role === "admin"} />{session.role === "admin" && (invite ? <FamilyInviteCard key={invite.code} invite={invite} /> : <section className="card"><h2>{t("Invite family members")}</h2><p role="alert">{t("Your family code could not be loaded. Refresh this page to try again.")}</p></section>)}<section className="card"><div className="card-head"><h2>{t("Your profile")}</h2><UserRound size={19} /></div><div className="setting-row"><div><strong>{t("Name")}</strong><p>{t("How your family sees you in Family Communicator.")}</p></div><span>{session.name}</span></div><div className="setting-row"><div><strong>{t("Email")}</strong><p>{t("Used to securely sign in.")}</p></div><span>{session.email}</span></div><div className="setting-row"><div><strong>{t("Family role")}</strong><p>{t("Controls which household information and actions are available.")}</p></div><span className="badge green">{t(session.role)}</span></div></section>
      <section className="card"><div className="card-head"><h2>{t("Privacy defaults")}</h2><LockKeyhole size={19} /></div><div className="setting-row"><div><strong><MapPin size={15} /> {" "}{t("Location sharing")}</strong><p>{t("Off until you explicitly choose to share it.")}</p></div><span className="badge">{t("Off")}</span></div><div className="setting-row"><div><strong><Bell size={15} /> {" "}{t("Arrival notifications")}</strong><p>{t("No arrival alerts without your permission.")}</p></div><span className="badge">{t("Off")}</span></div></section></div>
      <aside><section className="card"><span className="safety-icon"><Database /></span><h2>{t("Protected at the source")}</h2><p className="page-intro">{t("Every family's data is isolated in PostgreSQL with row-level security. Sensitive records require both a signed-in member and the correct family role.")}</p></section></aside></div>
  </>;
}
