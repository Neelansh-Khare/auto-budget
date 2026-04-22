import { NextResponse } from "next/server";
import { testPlaidConnection } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.settings.findUnique({ where: { userId: session.userId } });
    if (!settings?.plaidAccessTokenEnc) {
      throw new Error("Plaid not connected");
    }
    const accessToken = decrypt(settings.plaidAccessTokenEnc);
    const result = await testPlaidConnection(accessToken);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
