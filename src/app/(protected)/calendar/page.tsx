import { CalendarDays, MapPin } from "lucide-react";
import { createEventAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatTime, getFamilySnapshot } from "@/lib/family/data";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  const canEdit = session.role === "admin" || session.role === "parent";
  return <><PageHeader title="Family calendar" intro="One place for the plans everyone needs to know." />
    <div className="content-grid"><section className="card"><div className="card-head"><h2>Coming up</h2><span className="badge green">Amsterdam time</span></div>{data.events.length ? <div className="list">{data.events.map((event) => <article className="list-row" key={event.id}><span className="row-icon"><CalendarDays size={19} /></span><div className="row-main"><strong>{event.title}</strong><span>{event.location ? <><MapPin size={11} /> {event.location}</> : "No location"}</span></div><div className="row-meta">{formatDate(event.starts_at, { weekday: "short" })}<br />{formatTime(event.starts_at)}–{formatTime(event.ends_at)}</div></article>)}</div> : <EmptyState>No upcoming family events.</EmptyState>}</section>
      <aside>{canEdit ? <section className="card form-card"><div className="card-head"><h2>Add an event</h2></div><ActionForm action={createEventAction} buttonLabel="Add to calendar"><label className="field">What<input name="title" required maxLength={180} /></label><label className="field">Where<input name="location" maxLength={240} /></label><label className="field">Starts<input name="startsAt" type="datetime-local" required /></label><label className="field">Ends<input name="endsAt" type="datetime-local" required /></label></ActionForm></section> : <section className="card"><h2>Your calendar</h2><p className="page-intro">Parents and family admins can add shared events.</p></section>}</aside></div>
  </>;
}
