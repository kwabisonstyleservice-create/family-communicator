import { CheckCircle2, MapPin, Radio, ShieldAlert, ShieldCheck } from "lucide-react";
import { checkInAction, sosAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatTime, getFamilySnapshot } from "@/lib/family/data";

export const metadata = { title: "Safety" };

export default async function SafetyPage() {
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  return <><PageHeader title="Safety hub" intro="Quick reassurance when plans change—and a clear signal when help is needed." />
    {data.activeSos.length > 0 && <div className="notice"><strong>Active alert:</strong> {data.activeSos.map((item) => `${item.member_name}${item.message ? ` — ${item.message}` : ""}`).join(" · ")}</div>}
    <section className="safety-grid">
      <article className="card safety-card"><span className="safety-icon"><CheckCircle2 /></span><h2>Quick check-in</h2><p>Let the family know you are safe, arriving, or heading out.</p><ActionForm action={checkInAction} buttonLabel="Share check-in"><label className="field">Status<select name="status" defaultValue="safe"><option value="safe">I&apos;m safe</option><option value="leaving">I&apos;m leaving</option><option value="arrived">I&apos;ve arrived</option><option value="help">I need a hand</option></select></label><label className="field">Note (optional)<input name="message" maxLength={500} placeholder="A little context" /></label></ActionForm></article>
      <article className="card safety-card"><span className="safety-icon"><MapPin /></span><h2>Location sharing</h2><p>Location is opt-in and only visible at the level each family member chooses.</p><span className="badge">Off by default</span></article>
      <article className="card safety-card sos"><span className="safety-icon"><ShieldAlert /></span><h2>Ask for urgent help</h2><p>This immediately creates a visible alert for your household. In immediate danger, always call 112.</p><ActionForm action={sosAction} buttonLabel="Send SOS to family" dangerous><label className="field">Message (optional)<input name="message" maxLength={500} placeholder="Tell them what you need" /></label></ActionForm></article>
    </section>
    <div className="dashboard-grid" style={{marginTop:20}}><section className="card"><div className="card-head"><h2>Recent check-ins</h2><Radio size={18} /></div>{data.checkIns.length ? <div className="list">{data.checkIns.map((item) => <div className="list-row" key={item.id}><span className="row-icon"><ShieldCheck size={18} /></span><div className="row-main"><strong>{item.member_name} · {item.status}</strong><span>{item.message || "No note"}</span></div><div className="row-meta">{formatDate(item.created_at)}<br />{formatTime(item.created_at)}</div></div>)}</div> : <EmptyState>No recent check-ins.</EmptyState>}</section><section className="card"><div className="card-head"><h2>Shared places</h2><MapPin size={18} /></div>{data.locations.filter((item) => item.is_sharing).length ? <div className="list">{data.locations.filter((item) => item.is_sharing).map((item) => <div className="list-row" key={item.member_id}><span className="row-icon"><MapPin size={18} /></span><div className="row-main"><strong>{item.display_name}</strong><span>{item.place_label || "Location shared"}</span></div></div>)}</div> : <EmptyState>No one is sharing a location right now.</EmptyState>}</section></div>
  </>;
}
