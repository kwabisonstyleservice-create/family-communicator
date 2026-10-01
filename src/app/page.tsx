import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, HeartHandshake, Home, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { readSession } from "@/lib/auth/session";

export default async function LandingPage() {
  const t = await getTranslator();
  const session = await readSession();
  const appHref = session ? "/dashboard" : "/auth/sign-up";

  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link>
        <div className="nav-actions">
          <Link className="button button-secondary" href="/auth/sign-in">{t("Sign in")}</Link>
          <Link className="button button-primary" href={appHref}>{session ? t("Open Family Communicator") : t("Bring us together")}<ArrowRight size={16} /></Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div>
          <span className="eyebrow">{t("A home base for every day")}</span>
          <h1>{t("Your family,")}<br /><em>{t("beautifully")}</em> {" "}{t("connected.")}</h1>
          <p className="hero-copy">{t("Family Communicator keeps the people you love in step—with one private place for plans, tasks, check-ins, and the little updates that make a house feel like home.")}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={appHref}>{t("Start your family space")}{" "}<ArrowRight size={17} /></Link>
            <a className="button button-secondary" href="#features">{t("See how it helps")}</a>
          </div>
          <div className="hero-note"><ShieldCheck size={16} /> {" "}{t("Private by design. Your family controls what is shared.")}</div>
        </div>
        <div className="hero-card-wrap" aria-hidden="true">
          <div className="hero-blob" />
          <div className="hero-phone">
            <div className="phone-screen">
              <div className="phone-greeting"><div><small>{t("Good morning")}</small><h3>{t("The Jansens")}</h3></div><span className="brand-mark"><Home size={18} /></span></div>
              <div className="avatar-stack"><span className="avatar">MJ</span><span className="avatar">SJ</span><span className="avatar">LE</span><span className="avatar">NO</span></div>
              <div className="phone-card green"><CalendarDays size={23} /><div><strong>{t("Family dinner")}</strong><span>{t("Tonight · 18:30 · At home")}</span></div></div>
              <div className="phone-card"><strong>{t("Everyone checked in ✓")}</strong><span>{t("Last update 12 minutes ago")}</span></div>
              <div className="phone-card"><strong>{t("2 things to do today")}</strong><span>{t("Take out recycling · Feed Pixel")}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid" id="features">
        <article className="feature-card"><span className="feature-icon"><CalendarDays /></span><h2>{t("One shared rhythm")}</h2><p>{t("Family plans, appointments, responsibilities, and reminders stay visible without the group-chat archaeology.")}</p></article>
        <article className="feature-card"><span className="feature-icon"><HeartHandshake /></span><h2>{t("Help without hovering")}</h2><p>{t("Simple check-ins and thoughtful safety tools bring reassurance while respecting everyone's independence.")}</p></article>
        <article className="feature-card"><span className="feature-icon"><CheckCircle2 /></span><h2>{t("Life, shared fairly")}</h2><p>{t("Give every person a clear view of what needs doing—and notice the contributions that keep family life moving.")}</p></article>
      </section>

      <section className="privacy-band">
        <LockKeyhole size={36} />
        <div><h2>{t("Your family's world stays yours.")}</h2><p>{t("Role-based privacy, opt-in location sharing, and household isolation are built into the database—not added as an afterthought.")}</p></div>
        <Link className="button button-secondary" href="/auth/sign-up">{t("Create your private space")}{" "}<MapPin size={16} /></Link>
      </section>
      <footer className="landing-footer"><span>© 2026 Family Communicator</span><span>{t("Together, wherever life takes you.")}</span></footer>
    </main>
  );
}
