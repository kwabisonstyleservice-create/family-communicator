import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { getActiveSos } from "@/lib/sos/data";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    return NextResponse.json({ alerts: await getActiveSos(session) }, { headers });
  } catch {
    return NextResponse.json({ error: "Emergency updates could not be loaded." }, { status: 503, headers });
  }
}
