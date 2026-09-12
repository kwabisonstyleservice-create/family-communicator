import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, HeartHandshake, Home, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { readSession } from "@/lib/auth/session";

export default async function LandingPage() {
  const session = await readSession();
  const appHref = session ? "/dashboard" : "/auth/sign-up";

  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link>
        <div className="nav-actions">
          <Link className="button button-secondary" href="/auth/sign-in">Sign in</Link>
          <Link className="button button-primary" href={appHref}>{session ? "Open Family Communicator" : "Bring us together"}<ArrowRight size={16} /></Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div>
          <span className="eyebrow">A home base for every day</span>
          <h1>Your family,<br /><em>beautifully</em> connected.</h1>
          <p className="hero-copy">Family Communicator keeps the people you love in step—with one private place for plans, tasks, check-ins, and the little updates that make a house feel like home.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={appHref}>Start your family space <ArrowRight size={17} /></Link>
            <a className="button button-secondary" href="#features">See how it helps</a>
          </div>
          <div className="hero-note"><ShieldCheck size={16} /> Private by design. Your family controls what is shared.</div>
        </div>
        <div className="hero-card-wrap" aria-hidden="true">
          <div className="hero-blob" />
          <div className="hero-phone">
            <div className="phone-screen">
              <div className="phone-greeting"><div><small>Good morning</small><h3>The Jansens</h3></div><span className="brand-mark"><Home size={18} /></span></div>
              <div className="avatar-stack"><span className="avatar">MJ</span><span className="avatar">SJ</span><span className="avatar">LE</span><span className="avatar">NO</span></div>
              <div className="phone-card green"><CalendarDays size={23} /><div><strong>Family dinner</strong><span>Tonight · 18:30 · At home</span></div></div>
              <div className="phone-card"><strong>Everyone checked in ✓</strong><span>Last update 12 minutes ago</span></div>
              <div className="phone-card"><strong>2 things to do today</strong><span>Take out recycling · Feed Pixel</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid" id="features">
        <article className="feature-card"><span className="feature-icon"><CalendarDays /></span><h2>One shared rhythm</h2><p>Family plans, appointments, responsibilities, and reminders stay visible without the group-chat archaeology.</p></article>
        <article className="feature-card"><span className="feature-icon"><HeartHandshake /></span><h2>Help without hovering</h2><p>Simple check-ins and thoughtful safety tools bring reassurance while respecting everyone&apos;s independence.</p></article>
        <article className="feature-card"><span className="feature-icon"><CheckCircle2 /></span><h2>Life, shared fairly</h2><p>Give every person a clear view of what needs doing—and notice the contributions that keep family life moving.</p></article>
      </section>

      <section className="privacy-band">
        <LockKeyhole size={36} />
        <div><h2>Your family&apos;s world stays yours.</h2><p>Role-based privacy, opt-in location sharing, and household isolation are built into the database—not added as an afterthought.</p></div>
        <Link className="button button-secondary" href="/auth/sign-up">Create your private space <MapPin size={16} /></Link>
      </section>
      <footer className="landing-footer"><span>© 2026 Family Communicator</span><span>Together, wherever life takes you.</span></footer>
    </main>
  );
}
