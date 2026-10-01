import { LanguagePicker } from "@/components/language-picker";
import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { Heart, Home, ShieldCheck } from "lucide-react";
import { AuthForm } from "../_components/auth-form";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Create your family space") };
}

export default async function SignUpPage() {
  const t = await getTranslator();
  return <main className="auth-page"><div className="auth-layout"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link><div><Heart size={32} /><h1>{t("Make room")}<br />{t("for together.")}</h1><p>{t("Create your household or join the people who already invited you.")}</p></div><small><ShieldCheck size={14} /> {" "}{t("Privacy begins at signup")}</small></aside><section className="auth-panel"><h2>{t("Start with Family Communicator")}</h2><p>{t("Your private family space takes less than a minute.")}</p><LanguagePicker /><AuthForm mode="sign-up" /></section></div></main>;
}
