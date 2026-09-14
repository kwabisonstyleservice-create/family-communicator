import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "./index";

export type FamilyRole = "admin" | "parent" | "child" | "guest";

const databaseRole: Record<FamilyRole, string> = {
  admin: "family_admin",
  parent: "family_parent",
  child: "family_child",
  guest: "family_guest",
};

export type FamilyPrincipal = {
  memberId: string;
  householdId: string;
  role: FamilyRole;
  name: string;
  email: string;
};

export async function withRuntimeClient<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

export async function withFamilyContext<T>(
  principal: FamilyPrincipal,
  work: (client: PoolClient, role: FamilyRole) => Promise<T>,
) {
  return withRuntimeClient(async (client) => {
    await client.query("BEGIN");
    try {
      const role = databaseRole[principal.role];
      await client.query(`SET LOCAL ROLE ${role}`);
      const context = await client.query<{ family_role: FamilyRole; household_id: string }>("SELECT * FROM app.set_context($1)", [principal.memberId]);
      const current = context.rows[0];
      if (!current || !Object.hasOwn(databaseRole, current.family_role) || current.household_id !== principal.householdId) {
        throw new Error("Family access is no longer valid.");
      }
      await client.query(`SET LOCAL ROLE ${databaseRole[current.family_role]}`);
      const result = await work(client, current.family_role);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export function firstRow<T extends QueryResultRow>(rows: T[]): T | null {
  return rows[0] ?? null;
}
