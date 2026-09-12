import Link from "next/link";
import { Home, KeyRound, ShieldCheck } from "lucide-react";
import { ForgotPasswordForm } from "../_components/password-reset-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <main className="auth-page"><div className="auth-layout"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link><div><KeyRound size={32} /><h1>Let&apos;s get you<br />back home.</h1><p>We&apos;ll send a secure, one-time link to your email address.</p></div><small><ShieldCheck size={14} /> Links expire after 20 minutes</small></aside><section className="auth-panel"><h2>Forgot your password?</h2><p>Enter the email used for your family space.</p><ForgotPasswordForm /></section></div></main>;
}
