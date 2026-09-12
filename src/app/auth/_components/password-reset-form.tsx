"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import {
  forgotPasswordAction,
  resetPasswordAction,
  type AuthState,
  type ResetRequestState,
} from "../actions";

const initialRequestState: ResetRequestState = {};
const initialResetState: AuthState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialRequestState);
  return (
    <form action={formAction} className="form-grid">
      <label className="field">Email address<input name="email" type="email" autoComplete="email" required /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
      <button className="button button-primary button-wide" disabled={pending} type="submit">
        {pending ? <LoaderCircle className="spin" size={17} /> : "Send reset link"}<ArrowRight size={17} />
      </button>
      <p className="form-foot"><Link href="/auth/sign-in">Back to sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialResetState);
  return (
    <form action={formAction} className="form-grid">
      <input name="token" type="hidden" value={token} />
      <label className="field">New password<input name="password" type="password" autoComplete="new-password" required /></label>
      <label className="field">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required /></label>
      <p className="password-hint">Use at least 10 characters with uppercase, lowercase, and a number.</p>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button button-primary button-wide" disabled={pending} type="submit">
        {pending ? <LoaderCircle className="spin" size={17} /> : "Save new password"}<ArrowRight size={17} />
      </button>
    </form>
  );
}
