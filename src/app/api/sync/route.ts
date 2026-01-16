import { NextResponse } from "next/server";
import { performSync } from "@/lib/sync";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const push = Boolean(body?.pushToSheets);
  try {
    const result = await performSync({ pushToSheets: push });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

