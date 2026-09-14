import { classifyMemberAction } from "@/app/member-actions";
import { Megaphone, Users } from "lucide-react";
import { createAnnouncementAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate, getFamilySnapshot, initials } from "@/lib/family/data";

export const metadata = { title: "Family" };

export default async function FamilyPage() {
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  const canPost = session.role === "admin" || session.role === "parent";
  return <><PageHeader title="Your family" intro="The people, notes, and everyday updates that make up your home." />
    <div className="content-grid"><div className="stack">
      <section className="card"><div className="card-head"><h2>Family members</h2><span className="badge green">{data.members.length} people</span></div><div className="family-strip">{data.members.map((member) => <div className="family-person" key={member.id}><span className="avatar">{initials(member.display_name)}</span><strong>{member.display_name}</strong><small>{member.family_label || member.family_role}</small></div>)}</div></section>
      {session.role === "admin" && <section className="card"><div className="card-head"><h2>Manage members</h2></div><p>Classify joined members to give them the appropriate family access. Mother and Father have Parent access; Son and Daughter have Child access. Guests have restricted access.</p><p>Parents can manage shared plans and tasks. Children can see the family calendar, updates, their assigned tasks, and unassigned household tasks. Members should refresh their page after a change.</p><div className="stack">{data.members.filter(member => member.family_role !== "admin").map(member => <div key={member.id + member.family_role + member.family_label}><h3>{member.display_name}</h3><ActionForm action={classifyMemberAction} buttonLabel="Save classification"><input type="hidden" name="memberId" value={member.id} /><label className="field">Family classification<select name="label" defaultValue={member.family_label || (member.family_role === "guest" ? "guest" : "")} required><option value="" disabled>Choose classification</option><option value="guest">Guest — restricted access</option><option value="son">Son — child access</option><option value="daughter">Daughter — child access</option><option value="mother">Mother — parent access</option><option value="father">Father — parent access</option></select></label></ActionForm></div>)}</div></section>}
      <section className="card"><div className="card-head"><h2>Family board</h2><Megaphone size={19} /></div>{data.announcements.length ? <div className="list">{data.announcements.map((item) => <article className="list-row" key={item.id}><span className="row-icon"><Megaphone size={18} /></span><div className="row-main"><strong>{item.title}</strong><span style={{whiteSpace:"normal"}}>{item.body}</span><span>{item.creator_name || "Family"} · {formatDate(item.created_at)}</span></div><span className={`badge ${item.priority === "urgent" ? "coral" : ""}`}>{item.priority}</span></article>)}</div> : <EmptyState>No family updates have been posted yet.</EmptyState>}</section>
    </div><aside className="stack">{canPost ? <section className="card form-card"><div className="card-head"><h2>Post an update</h2></div><ActionForm action={createAnnouncementAction} buttonLabel="Share with family"><label className="field">Title<input name="title" required maxLength={160} /></label><label className="field">Message<textarea name="body" rows={4} required maxLength={4000} /></label><label className="field">Priority<select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label></ActionForm></section> : <section className="card"><Users className="safety-icon" /><h2>Everyone together</h2><p>Parents and family admins can post updates for the household here.</p></section>}</aside></div>
  </>;
}
