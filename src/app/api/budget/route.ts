import { NextResponse } from "next/server";
import { aggregateMonthTotals, getMonthKey } from "@/lib/aggregation";
import { CATEGORY_BUDGETS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const date = month ? new Date(month) : new Date();

  // Get running balances
  const accounts = await prisma.account.findMany({ where: { userId: session.userId } });
  const bankBalance = accounts.find((a) => a.mappedBalanceRole === "bank")?.balanceCurrent ?? 0;
  const cc1Balance = accounts.find((a) => a.mappedBalanceRole === "cc1")?.balanceCurrent ?? 0;
  const cc2Balance = accounts.find((a) => a.mappedBalanceRole === "cc2")?.balanceCurrent ?? 0;

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

  // Get category totals
  const totals = await aggregateMonthTotals(date, session.userId);
  const categories = dbCategories.map((c) => {
    const spent = totals.get(c.name) || 0;
    return {
      category: c.name,
      budget: c.monthlyBudget,
      spent,
      remaining: c.monthlyBudget - spent,
    };
  });

  return NextResponse.json({
    month: getMonthKey(date),
    balances: {
      bank: bankBalance,
      cc1: cc1Balance,
      cc2: cc2Balance,
    },
    categories,
  });
}