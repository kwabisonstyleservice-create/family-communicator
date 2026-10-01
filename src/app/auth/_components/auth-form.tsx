"use client";
import { useTranslations } from "@/components/language-provider";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { signInAction, signUpAction, type AuthState } from "../actions";

const initialState: AuthState = {};

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const t = useTranslations();
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [setupMode, setSetupMode] = useState<"create" | "join">("create");

  return (
    <form action={formAction} className="form-grid">
      {mode === "sign-up" && <label className="field">{t("Your name")}<input name="name" autoComplete="name" defaultValue={state.fields?.name} required /></label>}
      <label className="field">{t("Email address")}<input name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required /></label>
      <label className="field">{t("Password")}<input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required /></label>
      {mode === "sign-in" && <Link className="forgot-link" href="/auth/forgot-password">{t("Forgot your password?")}</Link>}
      {mode === "sign-up" && <>
        <label className="field">{t("Confirm password")}<input name="confirmPassword" type="password" autoComplete="new-password" required /></label>
        <div className="segmented" aria-label={t("Family setup")}>
          <label><input type="radio" name="setupMode" value="create" checked={setupMode === "create"} onChange={() => setSetupMode("create")} />{t("Create a family")}</label>
          <label><input type="radio" name="setupMode" value="join" checked={setupMode === "join"} onChange={() => setSetupMode("join")} />{t("Join with code")}</label>
        </div>
        {setupMode === "create"
          ? <label className="field">{t("Family name")}<input name="householdName" placeholder={t("e.g. The Jansens")} defaultValue={state.fields?.householdName} required /></label>
          : <label className="field">{t("Family code")}<input name="inviteCode" placeholder={t("Enter your invite code")} defaultValue={state.fields?.inviteCode} required /></label>}
      </>}
      {state.error && <p className="form-error" role="alert">{t(state.error)}</p>}
      <button className="button button-primary button-wide" disabled={pending} type="submit">
        {pending ? <LoaderCircle className="spin" size={17} /> : mode === "sign-in" ? t("Sign in") : t("Create family space")}<ArrowRight size={17} />
      </button>
      <p className="form-foot">{mode === "sign-in" ? <>{t("New to Family Communicator?")}{" "}<Link href="/auth/sign-up">{t("Create your space")}</Link></> : <>{t("Already have an account?")}{" "}<Link href="/auth/sign-in">{t("Sign in")}</Link></>}</p>
    </form>
  );
}
