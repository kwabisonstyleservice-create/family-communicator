import { getTranslator } from "@/lib/i18n/server";
import { classifyMemberAction } from "@/app/member-actions";
import { Megaphone, Users } from "lucide-react";
import { createAnnouncementAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate as baseFormatDate, getFamilySnapshot, initials } from "@/lib/family/data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Family") };
}

export default async function FamilyPage() {
  const t = await getTranslator();
  const formatDate = (value: Date | string, options?: Intl.DateTimeFormatOptions) => baseFormatDate(value, options, t.locale);
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  const canPost = session.role === "admin" || session.role === "parent";
  return <><PageHeader title={t("Your family")} intro={t("The people, notes, and everyday updates that make up your home.")} />
    <div className="content-grid"><div className="stack">
      <section className="card"><div className="card-head"><h2>{t("Family members")}</h2><span className="badge green">{data.members.length} {" "}{t("people")}</span></div><div className="family-strip">{data.members.map((member) => <div className="family-person" key={member.id}><span className="avatar">{initials(member.display_name)}</span><strong>{member.display_name}</strong><small>{t((member.family_label || member.family_role).replaceAll("_", " "))}</small></div>)}</div></section>
      {session.role === "admin" && <section className="card"><div className="card-head"><h2>{t("Manage members")}</h2></div><p>{t("Classify joined members to give them the appropriate family access. Mother and Father have Parent access; Son and Daughter have Child access. Guests have restricted access. Brothers, sisters, uncles and aunts have family access; existing Parent access is kept when switching to these labels.")}</p><p>{t("Parents can manage shared plans and tasks. Children can see the family calendar, updates, their assigned tasks, and unassigned household tasks. Members should refresh their page after a change.")}</p><div className="stack">{data.members.filter(member => member.family_role !== "admin").map(member => <div key={member.id + member.family_role + member.family_label}><h3>{member.display_name}</h3><ActionForm action={classifyMemberAction} buttonLabel={t("Save classification")}><input type="hidden" name="memberId" value={member.id} /><label className="field">{t("Family classification")}<select name="label" defaultValue={member.family_label || (member.family_role === "guest" ? "guest" : "")} required><option value="" disabled>{t("Choose classification")}</option><option value="guest">{t("Guest — restricted access")}</option><option value="son">{t("Son — child access")}</option><option value="daughter">{t("Daughter — child access")}</option><option value="mother">{t("Mother — parent access")}</option><option value="father">{t("Father — parent access")}</option><option value="brother">{t("Brother")}</option><option value="sister">{t("Sister")}</option><option value="big_brother">{t("Big brother")}</option><option value="big_sister">{t("Big sister")}</option><option value="little_brother">{t("Little brother")}</option><option value="little_sister">{t("Little sister")}</option><option value="uncle">{t("Uncle")}</option><option value="aunt">{t("Aunt")}</option></select></label></ActionForm></div>)}</div></section>}
      <section className="card"><div className="card-head"><h2>{t("Family board")}</h2><Megaphone size={19} /></div>{data.announcements.length ? <div className="list">{data.announcements.map((item) => <article className="list-row" key={item.id}><span className="row-icon"><Megaphone size={18} /></span><div className="row-main"><strong>{item.title}</strong><span style={{whiteSpace:"normal"}}>{item.body}</span><span>{item.creator_name || t("Family")} · {formatDate(item.created_at)}</span></div><span className={`badge ${item.priority === "urgent" ? "coral" : ""}`}>{t(item.priority)}</span></article>)}</div> : <EmptyState>{t("No family updates have been posted yet.")}</EmptyState>}</section>
    </div><aside className="stack">{canPost ? <section className="card form-card"><div className="card-head"><h2>{t("Post an update")}</h2></div><ActionForm action={createAnnouncementAction} buttonLabel={t("Share with family")}><label className="field">{t("Title")}<input name="title" required maxLength={160} /></label><label className="field">{t("Message")}<textarea name="body" rows={4} required maxLength={4000} /></label><label className="field">{t("Priority")}<select name="priority" defaultValue="normal"><option value="normal">{t("Normal")}</option><option value="important">{t("Important")}</option><option value="urgent">{t("Urgent")}</option></select></label></ActionForm></section> : <section className="card"><Users className="safety-icon" /><h2>{t("Everyone together")}</h2><p>{t("Parents and family admins can post updates for the household here.")}</p></section>}</aside></div>
  </>;
}
