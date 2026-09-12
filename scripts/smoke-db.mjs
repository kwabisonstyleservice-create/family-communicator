import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
const suffix = randomUUID().slice(0, 8);

try {
  await client.query("BEGIN");
  const passwordHash = await bcrypt.hash("SmokeTest1!", 4);

  const account = await client.query(
    "SELECT auth.register_account($1, $2, $3) AS account_id",
    [`smoke-${suffix}@example.invalid`, passwordHash, "Smoke Tester"],
  );
  const accountId = account.rows[0]?.account_id;
  assert.ok(accountId, "Registration did not return an account");

  const family = await client.query(
    "SELECT * FROM auth.create_household($1, $2)",
    [accountId, `Smoke Family ${suffix}`],
  );
  const memberId = family.rows[0]?.member_id;
  const householdId = family.rows[0]?.household_id;
  assert.ok(memberId && householdId, "Household onboarding failed");

  await client.query("SET LOCAL ROLE family_admin");
  await client.query("SELECT * FROM app.set_context($1)", [memberId]);

  const roster = await client.query("SELECT id FROM family.v_members_roster");
  assert.equal(roster.rowCount, 1, "RLS roster scope is incorrect");

  await client.query(`
    INSERT INTO family.announcements (household_id, created_by, title, body)
    VALUES (app.household_id(), app.member_id(), 'Smoke update', 'Database write works')
  `);
  await client.query(`
    INSERT INTO family.check_ins (household_id, member_id, status)
    VALUES (app.household_id(), app.member_id(), 'safe')
  `);
  await client.query(`
    INSERT INTO family.chores (household_id, assigned_to, title, points)
    VALUES (app.household_id(), app.member_id(), 'Smoke task', 5)
  `);
  await client.query(`
    INSERT INTO family.calendar_events (household_id, created_by, title, starts_at, ends_at)
    VALUES (app.household_id(), app.member_id(), 'Smoke event', now() + interval '1 day', now() + interval '25 hours')
  `);

  const visible = await client.query(`
    SELECT
      (SELECT count(*)::int FROM family.announcements) AS announcements,
      (SELECT count(*)::int FROM family.check_ins) AS check_ins,
      (SELECT count(*)::int FROM family.chores) AS chores,
      (SELECT count(*)::int FROM family.calendar_events) AS events
  `);
  assert.deepEqual(visible.rows[0], { announcements: 1, check_ins: 1, chores: 1, events: 1 });
  await client.query("ROLLBACK");
  console.log("Database smoke test passed: auth, onboarding, RLS context, and core writes.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
