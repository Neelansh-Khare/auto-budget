import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const rule = await prisma.rule.update({
    where: { id: params.id },
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
  { params }: { params: { id: string } },
) {
  await prisma.rule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

