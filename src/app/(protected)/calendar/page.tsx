import { getTranslator } from "@/lib/i18n/server";
import { CalendarDays, MapPin } from "lucide-react";
import { createEventAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate as baseFormatDate, formatTime, getFamilySnapshot } from "@/lib/family/data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Calendar") };
}

export default async function CalendarPage() {
  const t = await getTranslator();
  const formatDate = (value: Date | string, options?: Intl.DateTimeFormatOptions) => baseFormatDate(value, options, t.locale);
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  const canEdit = session.role === "admin" || session.role === "parent";
  return <><PageHeader title={t("Family calendar")} intro={t("One place for the plans everyone needs to know.")} />
    <div className="content-grid"><section className="card"><div className="card-head"><h2>{t("Coming up")}</h2><span className="badge green">{t("Amsterdam time")}</span></div>{data.events.length ? <div className="list">{data.events.map((event) => <article className="list-row" key={event.id}><span className="row-icon"><CalendarDays size={19} /></span><div className="row-main"><strong>{event.title}</strong><span>{event.location ? <><MapPin size={11} /> {event.location}</> : t("No location")}</span></div><div className="row-meta">{formatDate(event.starts_at, { weekday: "short" })}<br />{formatTime(event.starts_at)}–{formatTime(event.ends_at)}</div></article>)}</div> : <EmptyState>{t("No upcoming family events.")}</EmptyState>}</section>
      <aside>{canEdit ? <section className="card form-card"><div className="card-head"><h2>{t("Add an event")}</h2></div><ActionForm action={createEventAction} buttonLabel={t("Add to calendar")}><label className="field">{t("What")}<input name="title" required maxLength={180} /></label><label className="field">{t("Where")}<input name="location" maxLength={240} /></label><label className="field">{t("Starts")}<input name="startsAt" type="datetime-local" required /></label><label className="field">{t("Ends")}<input name="endsAt" type="datetime-local" required /></label></ActionForm></section> : <section className="card"><h2>{t("Your calendar")}</h2><p className="page-intro">{t("Parents and family admins can add shared events.")}</p></section>}</aside></div>
  </>;
}
