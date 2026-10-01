"use client";
import { useTranslations } from "./language-provider";
import { ActionForm } from "./action-form";
import { saveLanguageAction } from "@/app/language-actions";
export function LanguagePicker() {
  const t = useTranslations();
  return <section className="card">
    <h2>{t("Language")}</h2>
    <p>{t("Choose the language for this browser. Your family members can choose their own.")}</p>
    <ActionForm action={saveLanguageAction} buttonLabel={t("Save language")}>
      <label className="field">{t("Language")}<select name="locale" defaultValue={t.locale} key={t.locale}>
        <option value="en" lang="en">English</option><option value="nl" lang="nl">Nederlands</option>
      </select></label>
    </ActionForm>
  </section>;
}
