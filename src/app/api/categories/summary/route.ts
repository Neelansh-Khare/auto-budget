import { NextResponse } from "next/server";
import { aggregateMonthTotals, getMonthKey } from "@/lib/aggregation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CATEGORY_BUDGETS } from "@/lib/constants";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const date = month ? new Date(month) : new Date();

  // Get categories from DB
  let dbCategories = await prisma.category.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
  });

  if (dbCategories.length === 0) {
    await prisma.category.createMany({
      data: CATEGORY_BUDGETS.map((c) => ({
        userId: session.userId!,
        name: c.name,
        monthlyBudget: c.monthly_budget,
      })),
    });
    dbCategories = await prisma.category.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
    });
  }

  const totals = await aggregateMonthTotals(date, session.userId);
  const result = dbCategories.map((c) => {
    const spent = totals.get(c.name) || 0;
    return {
      category: c.name,
      budget: c.monthlyBudget,
      spent,
      remaining: c.monthlyBudget - spent,
    };
  });
  return NextResponse.json({ month: getMonthKey(date), summary: result });
}

