"use client";
import { useTranslations } from "@/components/language-provider";

import Link from "next/link";
import { useActionState, useState } from "react";
import { replaceFamilyCode, type InviteState } from "@/app/invite-actions";

export type FamilyInvite = { code: string; invited_role: string; uses: number };
const initialState: InviteState = {};

export function FamilyInviteCard({ invite }: { invite: FamilyInvite }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(replaceFamilyCode, initialState);
  const [copyStatus, setCopyStatus] = useState("");
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopyStatus(t("Code copied."));
    } catch {
      setCopyStatus(t("Copy is unavailable. Select the code above and copy it manually."));
    }
  }
  return <section className="card" aria-labelledby="family-invite-heading">
    <div className="card-head"><h2 id="family-invite-heading">{t("Invite family members")}</h2></div>
    <p>{t("Share this code privately with the people you want to join your family.")}</p>
    <div className="form-grid">
      <label className="field">{t("Family invitation code")}<input readOnly value={invite.code} onFocus={(event) => event.currentTarget.select()} style={{ minWidth: 0, width: "100%", boxSizing: "border-box", fontFamily: "monospace" }} />
      </label>
      <button type="button" className="button button-primary" onClick={copyCode}>{t("Copy code")}</button>
      <p role="status" aria-live="polite">{copyStatus}</p>
    </div>
    <p>{t("New members join as")}{" "}<strong>{t(invite.invited_role)}</strong>{t(". This code has been used")}{" "}{invite.uses} {invite.uses === 1 ? t("time") : t("times")}.</p>
    <p>{t("Ask them to open")}{" "}<Link href="/auth/sign-up">{t("Create your space")}</Link>{t(", select")}{" "}<strong>{t("Join with code")}</strong>{t(", and enter this code when registering.")}</p>
    <details>
      <summary>{t("Replace code or change joining role")}</summary>
      <form action={action} className="form-grid" style={{ marginTop: 16 }}>
        <label className="field">{t("Role for new members")}<select name="role" defaultValue={t(invite.invited_role)} disabled={pending}>
            <option value="guest">{t("Guest")}</option>
            <option value="child">{t("Child")}</option>
            <option value="parent">{t("Parent")}</option>
          </select>
        </label>
        <p>{t("Parents can manage shared plans, tasks, and updates. Replacing a code does not change existing members or their roles.")}</p>
        <label><input type="checkbox" name="confirm" value="yes" required disabled={pending} /> {" "}{t("I understand the previous code will stop working immediately.")}</label>
        {state.error && <p className="form-error" role="alert">{t(state.error)}</p>}
        {state.success && <p className="form-success" role="status">{t(state.success)}</p>}
        <button type="submit" className="button button-primary" disabled={pending}>{pending ? t("Replacing…") : t("Replace family code")}</button>
      </form>
    </details>
  </section>;
}
