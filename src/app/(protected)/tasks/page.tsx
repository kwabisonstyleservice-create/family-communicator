import { Check, CheckSquare2, Trophy } from "lucide-react";
import { completeChoreAction, createChoreAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate, getFamilySnapshot } from "@/lib/family/data";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  const canCreate = session.role === "admin" || session.role === "parent";
  return <><PageHeader title="Shared tasks" intro="Clear responsibilities, gentler reminders, and credit for helping out." />
    <div className="content-grid"><section className="card"><div className="card-head"><h2>Household list</h2><span className="badge green"><Trophy size={12} /> {data.chores.reduce((sum, item) => sum + (item.status === "verified" ? item.points : 0), 0)} earned</span></div>{data.chores.length ? <div className="list">{data.chores.map((chore) => <article className="list-row" key={chore.id}><span className="row-icon"><CheckSquare2 size={18} /></span><div className="row-main"><strong>{chore.title}</strong><span>{chore.assigned_name || "Anyone"}{chore.due_date ? ` · due ${formatDate(chore.due_date)}` : ""}{chore.points ? ` · ${chore.points} points` : ""}</span></div><span className={`badge ${chore.status === "verified" ? "green" : ""}`}>{chore.status.replace("_", " ")}</span>{(canCreate || chore.assigned_to === session.memberId) && (chore.status === "todo" || chore.status === "in_progress") && <form action={completeChoreAction}><input type="hidden" name="id" value={chore.id} /><button className="icon-button" aria-label={`Complete ${chore.title}`}><Check size={18} /></button></form>}</article>)}</div> : <EmptyState>The household task list is clear.</EmptyState>}</section>
      <aside>{canCreate ? <section className="card form-card"><div className="card-head"><h2>Add a task</h2></div><ActionForm action={createChoreAction} buttonLabel="Add task"><label className="field">Task<input name="title" required maxLength={160} /></label><label className="field">For<select name="assignedTo" defaultValue=""><option value="">Anyone</option>{data.members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label><div className="form-row"><label className="field">Due date<input name="dueDate" type="date" /></label><label className="field">Points<input name="points" type="number" min="0" max="1000" defaultValue="0" /></label></div></ActionForm></section> : <section className="card"><h2>Your contribution</h2><p className="page-intro">Mark a task complete when you finish it. A parent can verify it afterward.</p></section>}</aside></div>
  </>;
}
