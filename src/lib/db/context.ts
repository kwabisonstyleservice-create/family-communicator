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
  work: (client: PoolClient) => Promise<T>,
) {
  return withRuntimeClient(async (client) => {
    await client.query("BEGIN");
    try {
      const role = databaseRole[principal.role];
      await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SELECT * FROM app.set_context($1)", [principal.memberId]);
      const result = await work(client);
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
