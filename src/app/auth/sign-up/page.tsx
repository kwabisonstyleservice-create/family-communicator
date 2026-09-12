import Link from "next/link";
import { Heart, Home, ShieldCheck } from "lucide-react";
import { AuthForm } from "../_components/auth-form";

export const metadata = { title: "Create your family space" };

export default function SignUpPage() {
  return <main className="auth-page"><div className="auth-layout"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link><div><Heart size={32} /><h1>Make room<br />for together.</h1><p>Create your household or join the people who already invited you.</p></div><small><ShieldCheck size={14} /> Privacy begins at signup</small></aside><section className="auth-panel"><h2>Start with Family Communicator</h2><p>Your private family space takes less than a minute.</p><AuthForm mode="sign-up" /></section></div></main>;
}
