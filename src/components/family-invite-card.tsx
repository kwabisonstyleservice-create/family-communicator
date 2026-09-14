"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { replaceFamilyCode, type InviteState } from "@/app/invite-actions";

export type FamilyInvite = { code: string; invited_role: string; uses: number };
const initialState: InviteState = {};

export function FamilyInviteCard({ invite }: { invite: FamilyInvite }) {
  const [state, action, pending] = useActionState(replaceFamilyCode, initialState);
  const [copyStatus, setCopyStatus] = useState("");
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopyStatus("Code copied.");
    } catch {
      setCopyStatus("Copy is unavailable. Select the code above and copy it manually.");
    }
  }
  return <section className="card" aria-labelledby="family-invite-heading">
    <div className="card-head"><h2 id="family-invite-heading">Invite family members</h2></div>
    <p>Share this code privately with the people you want to join your family.</p>
    <div className="form-grid">
      <label className="field">Family invitation code
        <input readOnly value={invite.code} onFocus={(event) => event.currentTarget.select()} style={{ minWidth: 0, width: "100%", boxSizing: "border-box", fontFamily: "monospace" }} />
      </label>
      <button type="button" className="button button-primary" onClick={copyCode}>Copy code</button>
      <p role="status" aria-live="polite">{copyStatus}</p>
    </div>
    <p>New members join as <strong>{invite.invited_role}</strong>. This code has been used {invite.uses} {invite.uses === 1 ? "time" : "times"}.</p>
    <p>Ask them to open <Link href="/auth/sign-up">Create your space</Link>, select <strong>Join with code</strong>, and enter this code when registering.</p>
    <details>
      <summary>Replace code or change joining role</summary>
      <form action={action} className="form-grid" style={{ marginTop: 16 }}>
        <label className="field">Role for new members
          <select name="role" defaultValue={invite.invited_role} disabled={pending}>
            <option value="guest">Guest</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
          </select>
        </label>
        <p>Parents can manage shared plans, tasks, and updates. Replacing a code does not change existing members or their roles.</p>
        <label><input type="checkbox" name="confirm" value="yes" required disabled={pending} /> I understand the previous code will stop working immediately.</label>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        {state.success && <p className="form-success" role="status">{state.success}</p>}
        <button type="submit" className="button button-primary" disabled={pending}>{pending ? "Replacing…" : "Replace family code"}</button>
      </form>
    </details>
  </section>;
}
