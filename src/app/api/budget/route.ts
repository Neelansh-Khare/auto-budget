import { NextResponse } from "next/server";
import { aggregateMonthTotals, getMonthKey } from "@/lib/aggregation";
import { CATEGORY_BUDGETS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const date = month ? new Date(month) : new Date();
  
  // Get running balances
  const accounts = await prisma.account.findMany();
  const bankBalance = accounts.find((a) => a.mappedBalanceRole === "bank")?.balanceCurrent ?? 0;
  const cc1Balance = accounts.find((a) => a.mappedBalanceRole === "cc1")?.balanceCurrent ?? 0;
  const cc2Balance = accounts.find((a) => a.mappedBalanceRole === "cc2")?.balanceCurrent ?? 0;
  
  // Get category totals
  const totals = await aggregateMonthTotals(date);
  const categories = CATEGORY_BUDGETS.map((c) => {
    const spent = totals.get(c.name) || 0;
    return {
      category: c.name,
      budget: c.monthly_budget,
      spent,
      remaining: c.monthly_budget - spent,
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