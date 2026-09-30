import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { getFamilyMessages } from "@/lib/chat/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const messages = await getFamilyMessages(session);
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "Messages could not be loaded." }, { status: 500 });
  }
}
