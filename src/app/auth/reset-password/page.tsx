import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { Home, KeyRound, ShieldCheck } from "lucide-react";
import { ResetPasswordForm } from "../_components/password-reset-form";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Choose a new password") };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const t = await getTranslator();
  const token = (await searchParams).token ?? "";
  const looksValid = /^[A-Za-z0-9_-]{40,128}$/.test(token);

  return <main className="auth-page"><div className="auth-layout"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link><div><KeyRound size={32} /><h1>{t("Choose a new")}<br />{t("password.")}</h1><p>{t("A strong, unique password helps keep your family space private.")}</p></div><small><ShieldCheck size={14} /> {" "}{t("One-time secure reset")}</small></aside><section className="auth-panel"><h2>{t("New password")}</h2><p>{t("Enter and confirm your new password.")}</p>{looksValid ? <ResetPasswordForm token={token} /> : <><p className="form-error" role="alert">{t("This reset link is invalid. Please request a new one.")}</p><p className="form-foot"><Link href="/auth/forgot-password">{t("Request another link")}</Link></p></>}</section></div></main>;
}
