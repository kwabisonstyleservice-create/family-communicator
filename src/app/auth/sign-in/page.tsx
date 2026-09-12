import Link from "next/link";
import { Heart, Home, ShieldCheck } from "lucide-react";
import { AuthForm } from "../_components/auth-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return <main className="auth-page"><div className="auth-layout"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark"><Home size={20} /></span>Family Communicator</Link><div><Heart size={32} /><h1>Welcome<br />back home.</h1><p>Everything your family shares, right where you left it.</p></div><small><ShieldCheck size={14} /> Secure family access</small></aside><section className="auth-panel"><h2>Sign in</h2><p>Use the email and password for your family space.</p><AuthForm mode="sign-in" /></section></div></main>;
}
