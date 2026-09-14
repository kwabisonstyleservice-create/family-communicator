import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { withFamilyContext } from "@/lib/db/context";
import { redirect } from "next/navigation";
import type { FamilyPrincipal, FamilyRole } from "@/lib/db/context";

const COOKIE_NAME = "family_communicator_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(principal: FamilyPrincipal) {
  const token = await new SignJWT({
    householdId: principal.householdId,
    role: principal.role,
    name: principal.name,
    email: principal.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(principal.memberId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function readSession(): Promise<FamilyPrincipal | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (
      !payload.sub ||
      typeof payload.householdId !== "string" ||
      typeof payload.role !== "string" ||
      !["admin", "parent", "child", "guest"].includes(payload.role)
    ) {
      return null;
    }
    const principal: FamilyPrincipal = {
      memberId: payload.sub,
      householdId: payload.householdId,
      role: payload.role as FamilyRole,
      name: typeof payload.name === "string" ? payload.name : "Family member",
      email: typeof payload.email === "string" ? payload.email : "",
    };
    return await withFamilyContext(principal, async (_client, role) => ({ ...principal, role }));
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await readSession();
  if (!session) redirect("/auth/sign-in");
  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
