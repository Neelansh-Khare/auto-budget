import { NextResponse } from "next/server";
import { storeGoogleToken } from "@/lib/sheets";

export async function POST(req: Request) {
  const { code } = await req.json();
  await storeGoogleToken(code);
  return NextResponse.json({ ok: true });
}

