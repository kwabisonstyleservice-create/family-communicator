import type { FamilyPrincipal } from "@/lib/db/context";
import { withFamilyContext } from "@/lib/db/context";

export type GratitudeEntry = {
  id: string;
  member_id: string;
  member_name: string;
  body: string;
  gratitude_date: string;
  created_at: Date;
};

export async function getFamilyGratitude(principal: FamilyPrincipal) {
  return withFamilyContext(principal, async (client) => {
    const entries = await client.query<GratitudeEntry>(`
      SELECT entry.id, entry.member_id, member.display_name AS member_name,
             entry.body, to_char(entry.gratitude_date, 'YYYY-MM-DD') AS gratitude_date,
             entry.created_at
      FROM family.gratitude_entries entry
      JOIN family.v_members_roster member ON member.id = entry.member_id
      WHERE entry.household_id = app.household_id()
        AND entry.created_at >= now() - interval '31 days'
      ORDER BY entry.gratitude_date DESC, entry.created_at DESC, entry.id DESC
      LIMIT 200
    `);
    const today = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count
      FROM family.gratitude_entries
      WHERE household_id = app.household_id()
        AND member_id = app.member_id()
        AND gratitude_date = (now() AT TIME ZONE 'Europe/Amsterdam')::date
    `);

    return {
      entries: entries.rows,
      remainingToday: Math.max(0, 2 - (today.rows[0]?.count ?? 0)),
    };
  });
}
