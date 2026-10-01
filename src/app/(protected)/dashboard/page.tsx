import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { CalendarDays, CheckCircle2, CheckSquare2, Heart, MapPin, Megaphone, ShieldCheck } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { EmptyState, Topbar } from "@/components/ui";
import { checkInAction } from "@/app/actions";
import { requireSession } from "@/lib/auth/session";
import { formatDate as baseFormatDate, formatTime, getFamilySnapshot } from "@/lib/family/data";

import { getFamilyGratitude } from "@/lib/gratitude/data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Home") };
}

export default async function DashboardPage() {
  const t = await getTranslator();
  const formatDate = (value: Date | string, options?: Intl.DateTimeFormatOptions) => baseFormatDate(value, options, t.locale);
  const session = await requireSession();
  const [data, gratitude] = await Promise.all([
    getFamilySnapshot(session),
    getFamilyGratitude(session, true),
  ]);
  const openChores = data.chores.filter((chore) => chore.status === "todo" || chore.status === "in_progress");
  return <>
    <Topbar name={session.name} unread={data.unreadNotifications} />
    {data.activeSos.length > 0 && <div className="notice"><strong>{t("Active family alert:")}</strong> {data.activeSos.map((alert) => alert.member_name).join(", ")} {" "}{t("may need help. Open Safety for details.")}</div>}
    <div className="dashboard-grid">
      <div className="stack">
        <section className="card welcome-card"><span className="eyebrow" style={{color:"#d5eadf"}}>{t("Your family today")}</span><h2>{t("Small updates.")}<br />{t("A calmer home.")}</h2><p>{t("Share a quick check-in, see what is next, and keep everyone moving together.")}</p><div className="quick-actions"><ActionForm action={checkInAction} buttonLabel={t("I’m safe")} className=""><input type="hidden" name="status" value="safe" /></ActionForm><Link className="quick-action" href="/calendar"><CalendarDays size={16} />{t("Add a plan")}</Link><Link className="quick-action alert" href="/safety"><ShieldCheck size={16} />{t("Safety")}</Link></div></section>
        <section className="card"><div className="card-head"><h2>{t("Coming up")}</h2><Link className="card-link" href="/calendar">{t("Full calendar")}</Link></div>{data.events.length ? <div className="list">{data.events.slice(0,4).map((event) => <div className="list-row" key={event.id}><span className="row-icon"><CalendarDays size={19} /></span><div className="row-main"><strong>{event.title}</strong><span>{event.location || t("No location")}</span></div><div className="row-meta">{formatDate(event.starts_at)}<br />{formatTime(event.starts_at)}</div></div>)}</div> : <EmptyState>{t("No plans yet. Add the first family moment.")}</EmptyState>}</section>
        <section className="card"><div className="card-head"><h2>{t("Family board")}</h2><Link className="card-link" href="/family">{t("Open board")}</Link></div>{data.announcements.length ? <div className="list">{data.announcements.slice(0,3).map((item) => <div className="list-row" key={item.id}><span className="row-icon"><Megaphone size={18} /></span><div className="row-main"><strong>{item.title}</strong><span>{item.body}</span></div><span className={`badge ${item.priority === "urgent" ? "coral" : item.priority === "important" ? "green" : ""}`}>{t(item.priority)}</span></div>)}</div> : <EmptyState>{t("Family updates will appear here.")}</EmptyState>}</section>
      </div>
      <div className="stack">
        <section className="card" aria-labelledby="daily-gratitude-title">
          <div className="card-head"><h2 id="daily-gratitude-title">{t("Daily gratitude")}</h2><Link className="card-link" href="/gratitude">{t("View all")}</Link></div>
          {gratitude.entries.length ? <div>{gratitude.entries.slice(0, 4).map((entry) => <article className="gratitude-entry" key={entry.id}>
            <span className="row-icon"><Heart size={17} aria-hidden="true" /></span>
            <div className="row-main"><strong>{entry.member_id === session.memberId ? t("You") : entry.member_name}</strong><p>{entry.body}</p><time dateTime={entry.created_at.toISOString()}>{formatTime(entry.created_at)}</time></div>
          </article>)}</div> : <EmptyState>{t("What made you smile today? Share the first grateful moment with your family.")}</EmptyState>}
          <Link className="button button-primary" href="/gratitude"><Heart size={16} aria-hidden="true" />{gratitude.remainingToday > 0 ? t("Share your gratitude") : t("Visit family gratitude")}</Link>
        </section>
        <section className="card"><div className="card-head"><h2>{t("Things to do")}</h2><Link className="card-link" href="/tasks">{t("All tasks")}</Link></div>{openChores.length ? <div className="list">{openChores.slice(0,5).map((chore) => <div className="list-row" key={chore.id}><span className="row-icon"><CheckSquare2 size={18} /></span><div className="row-main"><strong>{chore.title}</strong><span>{chore.assigned_name || t("Anyone")}{chore.points ? ` · ${chore.points} ${t("points")}` : ""}</span></div></div>)}</div> : <EmptyState>{t("Nothing waiting. Enjoy the breathing room.")}</EmptyState>}</section>
        <section className="card"><div className="card-head"><h2>{t("Recent check-ins")}</h2><Link className="card-link" href="/safety">{t("Safety hub")}</Link></div>{data.checkIns.length ? <div className="list">{data.checkIns.slice(0,4).map((item) => <div className="list-row" key={item.id}><span className="row-icon"><CheckCircle2 size={18} /></span><div className="row-main"><strong>{item.member_name} · {t(item.status)}</strong><span>{item.message || `${formatDate(item.created_at)} ${t("at")} ${formatTime(item.created_at)}`}</span></div></div>)}</div> : <div className="empty"><MapPin size={30} /><div>{t("No one has checked in yet.")}</div></div>}</section>
      </div>
    </div>
  </>;
}
