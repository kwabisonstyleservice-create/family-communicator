import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/auth/password.ts";
import { signInSchema, signUpSchema } from "../src/lib/auth/validation.ts";

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
