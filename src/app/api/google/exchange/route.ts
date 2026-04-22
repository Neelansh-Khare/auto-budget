import { NextResponse } from "next/server";
import { storeGoogleToken } from "@/lib/sheets";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await req.json();
  await storeGoogleToken(session.userId, code);
  return NextResponse.json({ ok: true });
}

