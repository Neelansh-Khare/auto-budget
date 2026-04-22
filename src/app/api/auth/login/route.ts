import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  if (process.env.AUTH_DISABLED === "true") {
    // For local dev with auth disabled, find or create a default user
    let user = await prisma.user.findUnique({ where: { email: "dev@local.host" } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "dev@local.host",
          passwordHash: "N/A",
          name: "Dev User",
          settings: { create: {} },
          sheetConfigs: { create: { spreadsheetId: "" } }
        }
      });
    }
    const session = await getSession();
    session.authenticated = true;
    session.userId = user.id;
    session.userEmail = user.email;
    await session.save();
    return NextResponse.json({ ok: true });
  }

  const { email, password } = await req.json();
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.authenticated = true;
  session.userId = user.id;
  session.userEmail = user.email;
  await session.save();
  return NextResponse.json({ ok: true });
}

