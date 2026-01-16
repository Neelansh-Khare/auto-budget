import { NextResponse } from "next/server";
import { createLinkToken } from "@/lib/plaid";

export async function POST() {
  const token = await createLinkToken("single-user");
  return NextResponse.json({ link_token: token });
}

