import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  
  const existingRule = await prisma.rule.findFirst({
    where: { id, userId: session.userId }
  });
  if (!existingRule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const rule = await prisma.rule.update({
    where: { id },
    data: {
      name: body.name,
      pattern: body.pattern,
      patternType: body.patternType,
      category: body.category,
      priority: body.priority,
      enabled: body.enabled,
    },
  });
  return NextResponse.json({ rule });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existingRule = await prisma.rule.findFirst({
    where: { id, userId: session.userId }
  });
  if (!existingRule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.rule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

