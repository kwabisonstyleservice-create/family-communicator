import type { FamilyPrincipal } from "@/lib/db/context";
import { withFamilyContext } from "@/lib/db/context";
import type { SosAlert } from "./validation";

export async function getActiveSos(principal: FamilyPrincipal): Promise<SosAlert[]> {
  return withFamilyContext(principal, async (client) => {
    const { rows } = await client.query(`
      SELECT s.id, s.member_id, m.display_name AS member_name, s.message,
        s.latitude::float8, s.longitude::float8, s.accuracy_m::float8,
        s.location_updated_at, s.location_sharing, s.triggered_at
      FROM family.sos_alerts s
      JOIN family.v_members_roster m ON m.id = s.member_id
      WHERE s.household_id = app.household_id() AND s.status = 'active'
      ORDER BY s.triggered_at DESC
    `);
    return rows.map((row) => ({ ...row,
      location_updated_at: row.location_updated_at?.toISOString() ?? null,
      triggered_at: row.triggered_at.toISOString(),
    }));
  });
}
