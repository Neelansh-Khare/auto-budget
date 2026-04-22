import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.rule.findMany({
    where: { userId: session.userId },
    orderBy: { priority: "desc" },
  });
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const rule = await prisma.rule.create({
    data: {
      userId: session.userId,
      name: body.name,
      pattern: body.pattern,
      patternType: body.patternType,
      category: body.category,
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      eventType: "rule_created",
      payload: rule,
    },
  });
  return NextResponse.json({ rule });
}

