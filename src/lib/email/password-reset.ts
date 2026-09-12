import { Resend } from "resend";

function appUrl() {
  const configured = process.env.APP_URL?.trim();
  if (configured) return new URL(configured);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return new URL(`https://${productionHost}`);

  if (process.env.NODE_ENV !== "production") return new URL("http://localhost:3000");
  throw new Error("APP_URL is not configured");
}

export function passwordResetUrl(token: string) {
  const url = new URL("/auth/reset-password", appUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendPasswordResetEmail(input: { email: string; resetUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Password-reset email is not configured");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.email,
    subject: "Reset your Family Communicator password",
    text: `Use this secure link to choose a new password. It expires in 20 minutes and can only be used once:\n\n${input.resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#24342f;max-width:560px;margin:auto"><h1 style="font-family:Georgia,serif">Reset your password</h1><p>Use the button below to choose a new Family Communicator password. This link expires in 20 minutes and can only be used once.</p><p><a href="${input.resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#276955;color:#fff;text-decoration:none;font-weight:700">Choose a new password</a></p><p style="color:#6d7d76;font-size:14px">If you did not request this, you can safely ignore this email.</p></div>`,
  });

  if (error) throw new Error("Password-reset email could not be sent");
}
