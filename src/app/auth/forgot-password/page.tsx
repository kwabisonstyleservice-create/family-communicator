import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { Home, KeyRound, ShieldCheck } from "lucide-react";
import { ForgotPasswordForm } from "../_components/password-reset-form";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Reset password") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslator();
  return <main className="auth-page"><div className="auth-layout"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link><div><KeyRound size={32} /><h1>{t("Let's get you")}<br />{t("back home.")}</h1><p>{t("We'll send a secure, one-time link to your email address.")}</p></div><small><ShieldCheck size={14} /> {" "}{t("Links expire after 20 minutes")}</small></aside><section className="auth-panel"><h2>{t("Forgot your password?")}</h2><p>{t("Enter the email used for your family space.")}</p><ForgotPasswordForm /></section></div></main>;
}
