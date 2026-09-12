import { z } from "zod";

const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

const normalizedEmail = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const signInSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(100),
    email: normalizedEmail,
    password,
    confirmPassword: z.string(),
    setupMode: z.enum(["create", "join"]),
    householdName: z.string().trim().max(120).optional(),
    inviteCode: z.string().trim().max(40).optional(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
    }
    if (data.setupMode === "create" && (!data.householdName || data.householdName.length < 2)) {
      context.addIssue({ code: "custom", path: ["householdName"], message: "Enter a family name" });
    }
    if (data.setupMode === "join" && (!data.inviteCode || data.inviteCode.length < 6)) {
      context.addIssue({ code: "custom", path: ["inviteCode"], message: "Enter a valid family code" });
    }
  });

export const forgotPasswordSchema = z.object({
  email: normalizedEmail,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(40).max(128).regex(/^[A-Za-z0-9_-]+$/, "This reset link is invalid"),
    password,
    confirmPassword: z.string(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
    }
  });
