import { Bell, Database, LockKeyhole, MapPin, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  return <><PageHeader title="Settings" intro="Your profile, family privacy, and how Family Communicator reaches you." />
    <div className="content-grid"><div className="stack"><section className="card"><div className="card-head"><h2>Your profile</h2><UserRound size={19} /></div><div className="setting-row"><div><strong>Name</strong><p>How your family sees you in Family Communicator.</p></div><span>{session.name}</span></div><div className="setting-row"><div><strong>Email</strong><p>Used to securely sign in.</p></div><span>{session.email}</span></div><div className="setting-row"><div><strong>Family role</strong><p>Controls which household information and actions are available.</p></div><span className="badge green">{session.role}</span></div></section>
      <section className="card"><div className="card-head"><h2>Privacy defaults</h2><LockKeyhole size={19} /></div><div className="setting-row"><div><strong><MapPin size={15} /> Location sharing</strong><p>Off until you explicitly choose to share it.</p></div><span className="badge">Off</span></div><div className="setting-row"><div><strong><Bell size={15} /> Arrival notifications</strong><p>No arrival alerts without your permission.</p></div><span className="badge">Off</span></div></section></div>
      <aside><section className="card"><span className="safety-icon"><Database /></span><h2>Protected at the source</h2><p className="page-intro">Every family&apos;s data is isolated in PostgreSQL with row-level security. Sensitive records require both a signed-in member and the correct family role.</p></section></aside></div>
  </>;
}
