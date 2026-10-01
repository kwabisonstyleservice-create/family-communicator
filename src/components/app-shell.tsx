"use client";
import { useTranslations } from "@/components/language-provider";

import type { CSSProperties } from "react";
import { familyThemes, findFamilyTheme } from "@/lib/family/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare2, Heart, Home, LayoutDashboard, LogOut, MessageCircleMore, Settings, ShieldCheck, Users } from "lucide-react";
import type { FamilyPrincipal } from "@/lib/db/context";
import { signOutAction } from "@/app/actions";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "F";
}

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/family", label: "Family", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircleMore },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare2 },
  { href: "/gratitude", label: "Gratitude", icon: Heart },
  { href: "/safety", label: "Safety", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ session, children, themeId }: { session: FamilyPrincipal; children: React.ReactNode; themeId: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const theme = findFamilyTheme(themeId) ?? familyThemes[0];
  return <div className="app-body" style={{ "--green": theme.color, "--green-soft": theme.soft, "--paper": theme.paper, background: theme.paper } as CSSProperties}>
    <aside className="sidebar">
      <Link className="brand" href="/dashboard"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link>
      <nav className="side-nav">{links.map(({ href, label, icon: Icon }) => <Link className={`side-link ${pathname === href ? "active" : ""}`} href={href} key={href}><Icon size={19} />{t(label)}</Link>)}</nav>
      <div className="side-profile"><span className="avatar">{initials(session.name)}</span><div><strong>{session.name}</strong><small>{t(session.role)}</small></div><form action={signOutAction}><button className="icon-button" aria-label={t("Sign out")}><LogOut size={17} /></button></form></div>
    </aside>
    <main className="app-main">{children}</main>
    <nav className="mobile-bar" aria-label={t("Primary navigation")}>{links.map(({ href, label, icon: Icon }) => <Link className={`mobile-link ${pathname === href ? "active" : ""}`} href={href} key={href}><Icon size={19} />{t(label)}</Link>)}</nav>
  </div>;
}
