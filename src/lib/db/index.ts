import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { thuisPool?: Pool };

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalForDb.thuisPool) {
    globalForDb.thuisPool = new Pool({
      connectionString,
      max: process.env.NODE_ENV === "production" ? 10 : 4,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 8_000,
    });
    if (process.env.VERCEL) {
      attachDatabasePool(globalForDb.thuisPool);
    }
  }

  return globalForDb.thuisPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}
