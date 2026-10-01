import { LanguagePicker } from "@/components/language-picker";
import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { Heart, Home, ShieldCheck } from "lucide-react";
import { AuthForm } from "../_components/auth-form";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Sign in") };
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const t = await getTranslator();
  const resetComplete = (await searchParams).reset === "success";
  return <main className="auth-page"><div className="auth-layout"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link><div><Heart size={32} /><h1>{t("Welcome")}<br />{t("back home.")}</h1><p>{t("Everything your family shares, right where you left it.")}</p></div><small><ShieldCheck size={14} /> {" "}{t("Secure family access")}</small></aside><section className="auth-panel"><h2>{t("Sign in")}</h2><p>{t("Use the email and password for your family space.")}</p>{resetComplete && <p className="form-success" role="status">{t("Your password has been changed. You can sign in now.")}</p>}<LanguagePicker /><AuthForm mode="sign-in" /></section></div></main>;
}
