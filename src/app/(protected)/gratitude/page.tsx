import { getTranslator } from "@/lib/i18n/server";
import { Heart } from "lucide-react";
import { GratitudeForm } from "@/components/gratitude-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { formatDate as baseFormatDate, formatTime } from "@/lib/family/data";
import { getFamilyGratitude } from "@/lib/gratitude/data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Family gratitude") };
}

export default async function GratitudePage() {
  const t = await getTranslator();
  const formatDate = (value: Date | string, options?: Intl.DateTimeFormatOptions) => baseFormatDate(value, options, t.locale);
  const session = await requireSession();
  const { entries, remainingToday } = await getFamilyGratitude(session);
  const dates = [...new Set(entries.map((entry) => entry.gratitude_date))];

  return <>
    <PageHeader title={t("Family gratitude")} intro={t("Notice the good together. Every family member can share two grateful moments each day.")} />
    <div className="content-grid gratitude-layout">
      <section className="card">
        <div className="card-head"><h2>{t("Our grateful moments")}</h2><span className="badge green">{t("Last month")}</span></div>
        {entries.length ? <div className="gratitude-list">{dates.map((date) => <section className="gratitude-day" key={date}>
          <h3>{formatDate(date, { weekday: "long", year: "numeric" })}</h3>
          <div>{entries.filter((entry) => entry.gratitude_date === date).map((entry) => <article className="gratitude-entry" key={entry.id}>
            <span className="row-icon"><Heart size={17} aria-hidden="true" /></span>
            <div className="row-main"><strong>{entry.member_id === session.memberId ? t("You") : entry.member_name}</strong><p>{entry.body}</p><time dateTime={entry.created_at.toISOString()}>{formatTime(entry.created_at)}</time></div>
          </article>)}</div>
        </section>)}</div> : <EmptyState>{t("No gratitude has been shared yet. Begin with one good thing from today.")}</EmptyState>}
      </section>
      <aside><section className="card form-card"><div className="card-head"><h2>{t("Add today’s gratitude")}</h2></div><GratitudeForm remainingToday={remainingToday} /></section></aside>
    </div>
  </>;
}
