import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/auth/password.ts";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "../src/lib/auth/validation.ts";
import { createPasswordResetToken, hashPasswordResetToken } from "../src/lib/auth/reset-token.ts";

test("sign-in normalizes email addresses", () => {
  const result = signInSchema.parse({ email: "  Parent@Example.com ", password: "secret" });
  assert.equal(result.email, "parent@example.com");
});

test("signup requires a strong matching password", () => {
  const result = signUpSchema.safeParse({
    name: "Sam Parent",
    email: "sam@example.com",
    password: "too-weak",
    confirmPassword: "different",
    setupMode: "create",
    householdName: "The Family",
  });
  assert.equal(result.success, false);
});

test("signup requires the right household field for each mode", () => {
  const create = signUpSchema.safeParse({
    name: "Sam Parent",
    email: "sam@example.com",
    password: "StrongPass123",
    confirmPassword: "StrongPass123",
    setupMode: "create",
    householdName: "",
  });
  const join = signUpSchema.safeParse({
    name: "Alex Child",
    email: "alex@example.com",
    password: "StrongPass123",
    confirmPassword: "StrongPass123",
    setupMode: "join",
    inviteCode: "",
  });
  assert.equal(create.success, false);
  assert.equal(join.success, false);
});

test("password hashes verify without storing plaintext", async () => {
  const hash = await hashPassword("VeryStrong123");
  assert.notEqual(hash, "VeryStrong123");
  assert.equal(await verifyPassword("VeryStrong123", hash), true);
  assert.equal(await verifyPassword("WrongPassword123", hash), false);
});

test("password reset requests normalize email without exposing account state", () => {
  const result = forgotPasswordSchema.parse({ email: " Parent@Example.com " });
  assert.equal(result.email, "parent@example.com");
});

test("password reset tokens are random and stored only as hashes", () => {
  const first = createPasswordResetToken();
  const second = createPasswordResetToken();
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashPasswordResetToken(first.token));
  assert.match(first.tokenHash, /^[0-9a-f]{64}$/);
  assert.equal(first.tokenHash.includes(first.token), false);
});

test("new passwords must be strong and match", () => {
  const result = resetPasswordSchema.safeParse({
    token: createPasswordResetToken().token,
    password: "Weak-password",
    confirmPassword: "different",
  });
  assert.equal(result.success, false);
});
