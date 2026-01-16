import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  if (process.env.AUTH_DISABLED === "true") {
    return NextResponse.json({ authenticated: true });
  }
  const session = await getSession();
  return NextResponse.json({ authenticated: !!session.authenticated });
}

