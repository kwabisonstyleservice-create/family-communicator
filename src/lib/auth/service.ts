import type { PoolClient } from "pg";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";
import { createPasswordResetToken, hashPasswordResetToken } from "./reset-token";
import { passwordResetUrl, sendPasswordResetEmail } from "@/lib/email/password-reset";
import type { FamilyPrincipal, FamilyRole } from "@/lib/db/context";
import { firstRow, withRuntimeClient } from "@/lib/db/context";

type LoginRow = {
  member_id: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: Date | null;
  must_change: boolean;
  household_id: string;
  family_role: FamilyRole;
  is_active: boolean;
  display_name: string;
  email: string;
};

type OnboardingRow = {
  member_id: string;
  household_id: string;
  family_role: FamilyRole;
  status?: string;
};

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  setupMode: "create" | "join";
  householdName?: string;
  inviteCode?: string;
};

async function registerInTransaction(client: PoolClient, input: RegistrationInput) {
  const passwordHash = await hashPassword(input.password);
  const accountResult = await client.query<{ account_id: string }>(
    "SELECT auth.register_account($1, $2, $3) AS account_id",
    [input.email, passwordHash, input.name],
  );
  const accountId = accountResult.rows[0]?.account_id;
  if (!accountId) throw new Error("Account creation failed");

  if (input.setupMode === "create") {
    const result = await client.query<OnboardingRow>(
      "SELECT * FROM auth.create_household($1, $2)",
      [accountId, input.householdName],
    );
    return firstRow(result.rows);
  }

  const result = await client.query<OnboardingRow>(
    "SELECT * FROM auth.redeem_invite($1, $2)",
    [accountId, input.inviteCode],
  );
  const row = firstRow(result.rows);
  if (!row || row.status !== "joined") {
    throw new Error(row?.status === "rate_limited" ? "Too many code attempts. Try later." : "The family code is invalid or expired.");
  }
  return row;
}

export async function register(input: RegistrationInput) {
  const principal = await withRuntimeClient(async (client) => {
    await client.query("BEGIN");
    try {
      const row = await registerInTransaction(client, input);
      if (!row) throw new Error("Family setup failed");
      await client.query("COMMIT");
      return {
        memberId: row.member_id,
        householdId: row.household_id,
        role: row.family_role,
        name: input.name,
        email: input.email,
      } satisfies FamilyPrincipal;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
  await createSession(principal);
}

export async function signIn(email: string, password: string) {
  const principal = await withRuntimeClient(async (client) => {
    const result = await client.query<LoginRow>("SELECT * FROM auth.lookup_login_v2($1)", [email]);
    const login = firstRow(result.rows);
    const genericError = new Error("Email or password is incorrect.");
    if (!login || !login.is_active) throw genericError;
    if (login.locked_until && login.locked_until.getTime() > Date.now()) {
      throw new Error("This account is temporarily locked. Try again in 15 minutes.");
    }

    const valid = await verifyPassword(password, login.password_hash);
    await client.query("SELECT auth.record_login_result($1, $2)", [login.member_id, valid]);
    if (!valid) throw genericError;

    return {
      memberId: login.member_id,
      householdId: login.household_id,
      role: login.family_role,
      name: login.display_name,
      email: login.email,
    } satisfies FamilyPrincipal;
  });
  await createSession(principal);
}

export async function requestPasswordReset(email: string) {
  const { token, tokenHash } = createPasswordResetToken();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
  const created = await withRuntimeClient(async (client) => {
    const result = await client.query<{ created: boolean }>(
      "SELECT auth.request_password_reset($1, $2::char(64), $3) AS created",
      [email, tokenHash, expiresAt],
    );
    return result.rows[0]?.created === true;
  });

  if (!created) return;
  await sendPasswordResetEmail({ email, resetUrl: passwordResetUrl(token) });
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashPasswordResetToken(token);
  const passwordHash = await hashPassword(password);
  return withRuntimeClient(async (client) => {
    const result = await client.query<{ changed: boolean }>(
      "SELECT auth.consume_password_reset($1::char(64), $2) AS changed",
      [tokenHash, passwordHash],
    );
    return result.rows[0]?.changed === true;
  });
}
