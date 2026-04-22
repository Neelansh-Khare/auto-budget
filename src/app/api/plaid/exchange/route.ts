import { NextResponse } from "next/server";
import { exchangePublicToken } from "@/lib/plaid";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { public_token, institution } = await req.json();
  const accessToken = await exchangePublicToken(public_token);
  const encrypted = encrypt(accessToken);
  
  await prisma.settings.upsert({
    where: { userId: session.userId },
    update: { plaidAccessTokenEnc: encrypted },
    create: { userId: session.userId, plaidAccessTokenEnc: encrypted },
  });

  await prisma.auditLog.create({
    data: { 
      userId: session.userId,
      eventType: "plaid_connected", 
      payload: { institution } 
    },
  });
  
  return NextResponse.json({ ok: true });
}

