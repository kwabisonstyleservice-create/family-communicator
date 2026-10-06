import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { completeChoreAction } from "@/app/actions";
import { PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate, getFamilyChore } from "@/lib/family/data";
import { getTranslator } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Task details") };
}

export default async function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [task, t] = await Promise.all([getFamilyChore(session, id), getTranslator()]);
  if (!task) notFound();
  const canComplete = (session.role === "admin" || session.role === "parent" || task.assigned_to === session.memberId)
    && (task.status === "todo" || task.status === "in_progress");

  return <>
    <PageHeader title={t("Task details")} intro="" action={<Link className="button" href="/tasks">{t("Back to tasks")}</Link>} />
    <article className="card task-detail">
      <h2>{t("Task description")}</h2>
      <p className="task-description">{task.title}</p>
      <dl className="task-facts">
        <div><dt>{t("Assigned to")}</dt><dd>{task.assigned_name || t("Anyone")}</dd></div>
        <div><dt>{t("Due date")}</dt><dd>{task.due_date ? formatDate(task.due_date, { day: "numeric", month: "long", year: "numeric" }, t.locale) : t("No due date")}</dd></div>
        <div><dt>{t("Status")}</dt><dd>{t(task.status.replace("_", " "))}</dd></div>
        <div><dt>{t("Points")}</dt><dd>{task.points}</dd></div>
        {task.completed_at && <div><dt>{t("Completed on")}</dt><dd>{formatDate(task.completed_at, { day: "numeric", month: "long", year: "numeric" }, t.locale)}</dd></div>}
      </dl>
      {canComplete && <form action={completeChoreAction}><input type="hidden" name="id" value={task.id} /><button className="button button-primary">{t("Mark as complete")}</button></form>}
    </article>
  </>;
}
