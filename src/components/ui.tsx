import { Inbox } from "lucide-react";

export function PageHeader({ title, intro, action }: { title: string; intro: string; action?: React.ReactNode }) {
  return <header className="page-head"><div><h1 className="page-title">{title}</h1><p className="page-intro">{intro}</p></div>{action}</header>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty"><Inbox size={30} /><div>{children}</div></div>;
}

export function Topbar({ name, unread = 0 }: { name: string; unread?: number }) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <header className="topbar"><div className="topbar-copy"><h1>{greeting}, {name.split(" ")[0]}</h1><p>Here&apos;s what&apos;s happening with your family.</p></div><span className="status-pill"><span className="status-dot" />{unread ? `${unread} new notification${unread === 1 ? "" : "s"}` : "All caught up"}</span></header>;
}
