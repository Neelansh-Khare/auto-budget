import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rules = await prisma.rule.findMany({ orderBy: { priority: "desc" } });
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const body = await req.json();
  const rule = await prisma.rule.create({
    data: {
      name: body.name,
      pattern: body.pattern,
      patternType: body.patternType,
      category: body.category,
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
    },
  });
  await prisma.auditLog.create({
    data: { eventType: "rule_created", payload: rule },
  });
  return NextResponse.json({ rule });
}

