import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/sheets";

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.json({ url });
}

