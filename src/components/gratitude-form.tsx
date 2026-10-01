"use client";
import { useTranslations } from "@/components/language-provider";

import { useActionState, useEffect, useRef } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { createGratitudeAction } from "@/app/gratitude-actions";

export function GratitudeForm({ remainingToday }: { remainingToday: number }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(createGratitudeAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  if (remainingToday === 0) {
    return <div className="gratitude-limit"><Heart size={20} aria-hidden="true" /><p><strong>{t("Your gratitude is saved for today.")}</strong><span>{t("You can share two more things tomorrow.")}</span></p></div>;
  }

  return <form action={formAction} className="form-grid" ref={formRef}>
    <label className="field" htmlFor="gratitude-body">
      {t("What are you grateful for?")}<textarea id="gratitude-body" name="body" maxLength={500} required rows={4} placeholder={t("A person, a moment, something that made today better…")} />
    </label>
    <p className="form-hint">{t.locale === "nl" ? `Je kunt vandaag nog ${remainingToday} ${remainingToday === 1 ? "ding" : "dingen"} delen.` : `You can share ${remainingToday} more ${remainingToday === 1 ? "thing" : "things"} today.`}</p>
    {state.error && <p className="form-error" role="alert">{t(state.error)}</p>}
    {state.ok && <p className="badge green" role="status">{t("Shared with your family")}</p>}
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? <LoaderCircle size={17} aria-hidden="true" /> : <Heart size={17} aria-hidden="true" />}
      {pending ? t("Sharing") : t("Share gratitude")}
    </button>
  </form>;
}
