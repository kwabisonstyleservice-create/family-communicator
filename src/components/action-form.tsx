"use client";
import { useTranslations } from "@/components/language-provider";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import type { ActionState } from "@/app/actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, buttonLabel, className = "form-grid", dangerous = false }: { action: FormAction; children?: React.ReactNode; buttonLabel: string; className?: string; dangerous?: boolean }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className={className}>{children}{state.error && <p className="form-error" role="alert">{t(state.error)}</p>}{state.ok && <p className="badge green">{t("Saved")}</p>}<button className={`button ${dangerous ? "button-danger" : "button-primary"}`} disabled={pending} type="submit">{pending && <LoaderCircle size={16} />}{buttonLabel}</button></form>;
}
