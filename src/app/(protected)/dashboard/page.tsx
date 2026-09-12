import Link from "next/link";
import { CalendarDays, CheckCircle2, CheckSquare2, MapPin, Megaphone, ShieldCheck, Users } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { EmptyState, Topbar } from "@/components/ui";
import { checkInAction } from "@/app/actions";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatTime, getFamilySnapshot, initials } from "@/lib/family/data";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  const openChores = data.chores.filter((chore) => chore.status === "todo" || chore.status === "in_progress");
  return <>
    <Topbar name={session.name} unread={data.unreadNotifications} />
    {data.activeSos.length > 0 && <div className="notice"><strong>Active family alert:</strong> {data.activeSos.map((alert) => alert.member_name).join(", ")} may need help. Open Safety for details.</div>}
    <div className="dashboard-grid">
      <div className="stack">
        <section className="card welcome-card"><span className="eyebrow" style={{color:"#d5eadf"}}>Your family today</span><h2>Small updates.<br />A calmer home.</h2><p>Share a quick check-in, see what is next, and keep everyone moving together.</p><div className="quick-actions"><ActionForm action={checkInAction} buttonLabel="I’m safe" className=""><input type="hidden" name="status" value="safe" /></ActionForm><Link className="quick-action" href="/calendar"><CalendarDays size={16} />Add a plan</Link><Link className="quick-action alert" href="/safety"><ShieldCheck size={16} />Safety</Link></div></section>
        <section className="card"><div className="card-head"><h2>Coming up</h2><Link className="card-link" href="/calendar">Full calendar</Link></div>{data.events.length ? <div className="list">{data.events.slice(0,4).map((event) => <div className="list-row" key={event.id}><span className="row-icon"><CalendarDays size={19} /></span><div className="row-main"><strong>{event.title}</strong><span>{event.location || "No location"}</span></div><div className="row-meta">{formatDate(event.starts_at)}<br />{formatTime(event.starts_at)}</div></div>)}</div> : <EmptyState>No plans yet. Add the first family moment.</EmptyState>}</section>
        <section className="card"><div className="card-head"><h2>Family board</h2><Link className="card-link" href="/family">Open board</Link></div>{data.announcements.length ? <div className="list">{data.announcements.slice(0,3).map((item) => <div className="list-row" key={item.id}><span className="row-icon"><Megaphone size={18} /></span><div className="row-main"><strong>{item.title}</strong><span>{item.body}</span></div><span className={`badge ${item.priority === "urgent" ? "coral" : item.priority === "important" ? "green" : ""}`}>{item.priority}</span></div>)}</div> : <EmptyState>Family updates will appear here.</EmptyState>}</section>
      </div>
      <div className="stack">
        <section className="card"><div className="card-head"><h2>At a glance</h2><Link className="card-link" href="/family"><Users size={16} /></Link></div><div className="family-strip">{data.members.slice(0,4).map((member) => <div className="family-person" key={member.id}><span className="avatar">{initials(member.display_name)}</span><strong>{member.display_name.split(" ")[0]}</strong><small>{member.family_role}</small></div>)}</div></section>
        <section className="card"><div className="card-head"><h2>Things to do</h2><Link className="card-link" href="/tasks">All tasks</Link></div>{openChores.length ? <div className="list">{openChores.slice(0,5).map((chore) => <div className="list-row" key={chore.id}><span className="row-icon"><CheckSquare2 size={18} /></span><div className="row-main"><strong>{chore.title}</strong><span>{chore.assigned_name || "Anyone"}{chore.points ? ` · ${chore.points} points` : ""}</span></div></div>)}</div> : <EmptyState>Nothing waiting. Enjoy the breathing room.</EmptyState>}</section>
        <section className="card"><div className="card-head"><h2>Recent check-ins</h2><Link className="card-link" href="/safety">Safety hub</Link></div>{data.checkIns.length ? <div className="list">{data.checkIns.slice(0,4).map((item) => <div className="list-row" key={item.id}><span className="row-icon"><CheckCircle2 size={18} /></span><div className="row-main"><strong>{item.member_name} · {item.status}</strong><span>{item.message || `${formatDate(item.created_at)} at ${formatTime(item.created_at)}`}</span></div></div>)}</div> : <div className="empty"><MapPin size={30} /><div>No one has checked in yet.</div></div>}</section>
      </div>
    </div>
  </>;
}
