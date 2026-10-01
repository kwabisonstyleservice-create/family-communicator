import { withFamilyContext, type FamilyPrincipal } from "@/lib/db/context";
import { familyThemes, findFamilyTheme } from "./themes";

export async function getFamilyTheme(principal: FamilyPrincipal) {
  return withFamilyContext(principal, async (client) => {
    const result = await client.query<{ theme: string }>(
      "SELECT theme FROM family.appearance_settings WHERE household_id = app.household_id()",
    );
    return findFamilyTheme(result.rows[0]?.theme) ?? familyThemes[0];
  });
}
