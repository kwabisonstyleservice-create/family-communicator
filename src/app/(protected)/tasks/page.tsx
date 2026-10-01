import { getTranslator } from "@/lib/i18n/server";
import { Check, CheckSquare2, Trophy } from "lucide-react";
import { completeChoreAction, createChoreAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate as baseFormatDate, getFamilySnapshot } from "@/lib/family/data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Tasks") };
}

export default async function TasksPage() {
  const t = await getTranslator();
  const formatDate = (value: Date | string, options?: Intl.DateTimeFormatOptions) => baseFormatDate(value, options, t.locale);
  const session = await requireSession();
  const data = await getFamilySnapshot(session);
  const canAssign = session.role === "admin" || session.role === "parent";

  return <>
    <PageHeader title={t("Shared tasks")} intro={t("Clear responsibilities, gentler reminders, and credit for helping out.")} />
    <div className="content-grid">
      <section className="card">
        <div className="card-head">
          <h2>{t("Household list")}</h2>
          <span className="badge green"><Trophy size={12} /> {data.chores.reduce((sum, item) => sum + (item.status === "verified" ? item.points : 0), 0)} {" "}{t("earned")}</span>
        </div>
        {data.chores.length ? <div className="list">{data.chores.map((chore) => <article className="list-row" key={chore.id}>
          <span className="row-icon"><CheckSquare2 size={18} /></span>
          <div className="row-main"><strong>{chore.title}</strong><span>{chore.assigned_name || t("Anyone")}{chore.due_date ? ` · ${t("due")} ${formatDate(chore.due_date)}` : ""}{chore.points ? ` · ${chore.points} ${t("points")}` : ""}</span></div>
          <span className={`badge ${chore.status === "verified" ? "green" : ""}`}>{t(chore.status.replace("_", " "))}</span>
          {(canAssign || chore.assigned_to === session.memberId) && (chore.status === "todo" || chore.status === "in_progress") && <form action={completeChoreAction}><input type="hidden" name="id" value={chore.id} /><button className="icon-button" aria-label={`${t("Complete")} ${chore.title}`}><Check size={18} /></button></form>}
        </article>)}</div> : <EmptyState>{t("The household task list is clear.")}</EmptyState>}
      </section>
      <aside>
        <section className="card form-card">
          <div className="card-head"><h2>{t("Add a task")}</h2></div>
          <ActionForm action={createChoreAction} buttonLabel={t("Add task")}>
            <label className="field">{t("Task")}<input name="title" required maxLength={160} /></label>
            {canAssign ? <label className="field">{t("For")}<select name="assignedTo" defaultValue=""><option value="">{t("Anyone")}</option>{data.members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label> : <><input type="hidden" name="assignedTo" value={session.memberId} /><p className="form-hint">{t("This task will be added to your own list.")}</p></>}
            <div className="form-row">
              <label className="field">{t("Due date")}<input name="dueDate" type="date" /></label>
              {canAssign ? <label className="field">{t("Points")}<input name="points" type="number" min="0" max="1000" defaultValue="0" /></label> : <input type="hidden" name="points" value="0" />}
            </div>
          </ActionForm>
        </section>
      </aside>
    </div>
  </>;
}
