import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./db/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://unused:unused@localhost:5432/unused",
  },
  strict: true,
  verbose: true,
});
