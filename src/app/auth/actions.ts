"use server";

import { redirect } from "next/navigation";
import { register, requestPasswordReset, resetPassword, signIn } from "@/lib/auth/service";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/auth/validation";

export type AuthState = { error?: string; fields?: Record<string, string> };
export type ResetRequestState = AuthState & { success?: string };

function messageFrom(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong. Please try again.";
  if (error.message.includes("duplicate") || error.message.includes("already")) return "An account with this email already exists.";
  if (error.message.includes("invalid or expired")) return "That family code is invalid or expired.";
  if (error.message.includes("locked")) return "This account is temporarily locked. Try again in 15 minutes.";
  if (error.message.includes("incorrect")) return "Email or password is incorrect.";
  if (error.message.includes("Too many code attempts")) return error.message;
  return "Something went wrong. Please try again.";
}

export async function signInAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  try {
    await signIn(parsed.data.email, parsed.data.password);
  } catch (error) {
    return { error: messageFrom(error), fields: { email: parsed.data.email } };
  }
  redirect("/dashboard");
}

export async function signUpAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData);
  const parsed = signUpSchema.safeParse(raw);
  const fields = { name: String(raw.name ?? ""), email: String(raw.email ?? ""), householdName: String(raw.householdName ?? ""), inviteCode: String(raw.inviteCode ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details.", fields };
  try {
    await register(parsed.data);
  } catch (error) {
    return { error: messageFrom(error), fields };
  }
  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _state: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };

  try {
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    console.error("Password-reset request failed", error instanceof Error ? error.message : "Unknown error");
  }

  return {
    success: "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.",
  };
}

export async function resetPasswordAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const changed = await resetPassword(parsed.data.token, parsed.data.password);
  if (!changed) return { error: "This reset link is invalid or has expired. Request a new one." };
  redirect("/auth/sign-in?reset=success");
}
