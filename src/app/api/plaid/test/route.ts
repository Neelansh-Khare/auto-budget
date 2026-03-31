import { NextResponse } from "next/server";
import { testPlaidConnection } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export async function POST() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
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
