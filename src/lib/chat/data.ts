import type { FamilyPrincipal } from "@/lib/db/context";
import { withFamilyContext } from "@/lib/db/context";

export type FamilyMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: Date;
};

export async function getFamilyMessages(principal: FamilyPrincipal, limit = 100) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  return withFamilyContext(principal, async (client) => {
    const result = await client.query<FamilyMessage>(`
      SELECT message.id, message.sender_id, member.display_name AS sender_name,
             message.body, message.created_at
      FROM (
        SELECT id, sender_id, body, created_at
        FROM family.chat_messages
        WHERE household_id = app.household_id()
        ORDER BY created_at DESC, id DESC
        LIMIT $1
      ) AS message
      JOIN family.v_members_roster member ON member.id = message.sender_id
      ORDER BY message.created_at, message.id
    `, [safeLimit]);

    return result.rows;
  });
}
