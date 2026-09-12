"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { signInAction, signUpAction, type AuthState } from "../actions";

const initialState: AuthState = {};

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [setupMode, setSetupMode] = useState<"create" | "join">("create");

  return (
    <form action={formAction} className="form-grid">
      {mode === "sign-up" && <label className="field">Your name<input name="name" autoComplete="name" defaultValue={state.fields?.name} required /></label>}
      <label className="field">Email address<input name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required /></label>
      <label className="field">Password<input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required /></label>
      {mode === "sign-up" && <>
        <label className="field">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required /></label>
        <div className="segmented" aria-label="Family setup">
          <label><input type="radio" name="setupMode" value="create" checked={setupMode === "create"} onChange={() => setSetupMode("create")} />Create a family</label>
          <label><input type="radio" name="setupMode" value="join" checked={setupMode === "join"} onChange={() => setSetupMode("join")} />Join with code</label>
        </div>
        {setupMode === "create"
          ? <label className="field">Family name<input name="householdName" placeholder="e.g. The Jansens" defaultValue={state.fields?.householdName} required /></label>
          : <label className="field">Family code<input name="inviteCode" placeholder="Enter your invite code" defaultValue={state.fields?.inviteCode} required /></label>}
      </>}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button button-primary button-wide" disabled={pending} type="submit">
        {pending ? <LoaderCircle className="spin" size={17} /> : mode === "sign-in" ? "Sign in" : "Create family space"}<ArrowRight size={17} />
      </button>
      <p className="form-foot">{mode === "sign-in" ? <>New to Family Communicator? <Link href="/auth/sign-up">Create your space</Link></> : <>Already have an account? <Link href="/auth/sign-in">Sign in</Link></>}</p>
    </form>
  );
}
