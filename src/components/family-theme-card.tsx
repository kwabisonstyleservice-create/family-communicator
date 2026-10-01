import { ActionForm } from "@/components/action-form";
import { saveFamilyThemeAction } from "@/app/appearance-actions";
import { familyThemes } from "@/lib/family/themes";

export function FamilyThemeCard({ current, canEdit }: { current: string; canEdit: boolean }) {
  return <section className="card">
    <div className="card-head"><h2>Family appearance</h2></div>
    <p>Choose a colour for your family’s buttons, highlights and background. Everyone in your family will see it when they refresh the app.</p>
    {canEdit ? <ActionForm key={current} action={saveFamilyThemeAction} buttonLabel="Save family theme">
      <fieldset className="theme-fieldset"><legend>Choose your family colour</legend>
        <div className="theme-options">{familyThemes.map((theme) => <label className="theme-option" key={theme.id}>
          <input type="radio" name="theme" value={theme.id} defaultChecked={theme.id === current} required />
          <span className="theme-swatch" style={{ background: theme.color }} aria-hidden="true" />
          <span>{theme.name}</span>
        </label>)}</div>
      </fieldset>
    </ActionForm> : <p>Your family theme is <strong>{familyThemes.find((theme) => theme.id === current)?.name}</strong>. Ask your family admin to change it.</p>}
  </section>;
}
