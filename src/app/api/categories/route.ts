import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CATEGORY_BUDGETS } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let categories = await prisma.category.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
  });

  // If no categories found, seed from constants
  if (categories.length === 0) {
    await prisma.category.createMany({
      data: CATEGORY_BUDGETS.map((c) => ({
        userId: session.userId!,
        name: c.name,
        monthlyBudget: c.monthly_budget,
      })),
    });
    categories = await prisma.category.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
    });
  }

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categories } = await req.json();

  for (const cat of categories) {
    if (cat.id) {
      await prisma.category.update({
        where: { id: cat.id, userId: session.userId },
        data: { name: cat.name, monthlyBudget: cat.monthlyBudget },
      });
    } else {
      await prisma.category.upsert({
        where: { userId_name: { userId: session.userId, name: cat.name } },
        update: { monthlyBudget: cat.monthlyBudget },
        create: {
          userId: session.userId,
          name: cat.name,
          monthlyBudget: cat.monthlyBudget,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  await prisma.category.delete({
    where: { id, userId: session.userId },
  });

  return NextResponse.json({ ok: true });
}
