"use client";
import { useTranslations } from "@/components/language-provider";
import { Inbox } from "lucide-react";

export function PageHeader({ title, intro, action }: { title: string; intro: string; action?: React.ReactNode }) {
  return <header className="page-head"><div><h1 className="page-title">{title}</h1><p className="page-intro">{intro}</p></div>{action}</header>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty"><Inbox size={30} /><div>{children}</div></div>;
}

export function Topbar({ name, unread = 0 }: { name: string; unread?: number }) {
  const t = useTranslations();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }).format(new Date()));
  const greeting = hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening");
  return <header className="topbar"><div className="topbar-copy"><h1>{greeting}, {name.split(" ")[0]}</h1><p>{t("Here's what's happening with your family.")}</p></div><span className="status-pill"><span className="status-dot" />{unread ? (t.locale === "nl" ? `${unread} nieuwe melding${unread === 1 ? "" : "en"}` : `${unread} new notification${unread === 1 ? "" : "s"}`) : t("All caught up")}</span></header>;
}
