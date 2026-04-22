import { NextResponse } from "next/server";
import { performSync } from "@/lib/sync";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const push = Boolean(body?.pushToSheets);
  try {
    const result = await performSync({ userId: session.userId, pushToSheets: push });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

