import { NextResponse } from "next/server";
import { createLinkToken } from "@/lib/plaid";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await createLinkToken(session.userId);
  return NextResponse.json({ link_token: token });
}

