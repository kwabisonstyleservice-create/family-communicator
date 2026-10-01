import { getTranslator } from "@/lib/i18n/server";
import { CheckCircle2, MapPin, Radio, ShieldAlert, ShieldCheck } from "lucide-react";
import { checkInAction, sosAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate as baseFormatDate, formatTime, getFamilySnapshot } from "@/lib/family/data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Safety") };
}

export default async function SafetyPage() {
  const t = await getTranslator();
  const formatDate = (value: Date | string, options?: Intl.DateTimeFormatOptions) => baseFormatDate(value, options, t.locale);
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  return <><PageHeader title={t("Safety hub")} intro={t("Quick reassurance when plans change—and a clear signal when help is needed.")} />
    {data.activeSos.length > 0 && <div className="notice"><strong>{t("Active alert:")}</strong> {data.activeSos.map((item) => `${item.member_name}${item.message ? ` — ${item.message}` : ""}`).join(" · ")}</div>}
    <section className="safety-grid">
      <article className="card safety-card"><span className="safety-icon"><CheckCircle2 /></span><h2>{t("Quick check-in")}</h2><p>{t("Let the family know you are safe, arriving, or heading out.")}</p><ActionForm action={checkInAction} buttonLabel={t("Share check-in")}><label className="field">{t("Status")}<select name="status" defaultValue="safe"><option value="safe">{t("I'm safe")}</option><option value="leaving">{t("I'm leaving")}</option><option value="arrived">{t("I've arrived")}</option><option value="help">{t("I need a hand")}</option></select></label><label className="field">{t("Note (optional)")}<input name="message" maxLength={500} placeholder={t("A little context")} /></label></ActionForm></article>
      <article className="card safety-card"><span className="safety-icon"><MapPin /></span><h2>{t("Location sharing")}</h2><p>{t("Location is opt-in and only visible at the level each family member chooses.")}</p><span className="badge">{t("Off by default")}</span></article>
      <article className="card safety-card sos"><span className="safety-icon"><ShieldAlert /></span><h2>{t("Ask for urgent help")}</h2><p>{t("This immediately creates a visible alert for your household. In immediate danger, always call 112.")}</p><ActionForm action={sosAction} buttonLabel={t("Send SOS to family")} dangerous><label className="field">{t("Message (optional)")}<input name="message" maxLength={500} placeholder={t("Tell them what you need")} /></label></ActionForm></article>
    </section>
    <div className="dashboard-grid" style={{marginTop:20}}><section className="card"><div className="card-head"><h2>{t("Recent check-ins")}</h2><Radio size={18} /></div>{data.checkIns.length ? <div className="list">{data.checkIns.map((item) => <div className="list-row" key={item.id}><span className="row-icon"><ShieldCheck size={18} /></span><div className="row-main"><strong>{item.member_name} · {t(item.status)}</strong><span>{item.message || t("No note")}</span></div><div className="row-meta">{formatDate(item.created_at)}<br />{formatTime(item.created_at)}</div></div>)}</div> : <EmptyState>{t("No recent check-ins.")}</EmptyState>}</section><section className="card"><div className="card-head"><h2>{t("Shared places")}</h2><MapPin size={18} /></div>{data.locations.filter((item) => item.is_sharing).length ? <div className="list">{data.locations.filter((item) => item.is_sharing).map((item) => <div className="list-row" key={item.member_id}><span className="row-icon"><MapPin size={18} /></span><div className="row-main"><strong>{item.display_name}</strong><span>{item.place_label || t("Location shared")}</span></div></div>)}</div> : <EmptyState>{t("No one is sharing a location right now.")}</EmptyState>}</section></div>
  </>;
}
