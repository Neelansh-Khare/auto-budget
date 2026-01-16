import { NextResponse } from "next/server";
import { exchangePublicToken } from "@/lib/plaid";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { public_token, institution } = await req.json();
  const accessToken = await exchangePublicToken(public_token);
  const encrypted = encrypt(accessToken);
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: { plaidAccessTokenEnc: encrypted },
    create: { id: "singleton", plaidAccessTokenEnc: encrypted },
  });
  await prisma.auditLog.create({
    data: { eventType: "plaid_connected", payload: { institution } },
  });
  return NextResponse.json({ ok: true });
}

