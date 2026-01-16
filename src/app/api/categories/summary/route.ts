import { NextResponse } from "next/server";
import { aggregateMonthTotals, getMonthKey } from "@/lib/aggregation";
import { CATEGORY_BUDGETS } from "@/lib/constants";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const date = month ? new Date(month) : new Date();
  const totals = await aggregateMonthTotals(date);
  const result = CATEGORY_BUDGETS.map((c) => {
    const spent = totals.get(c.name) || 0;
    return {
      category: c.name,
      budget: c.monthly_budget,
      spent,
      remaining: c.monthly_budget - spent,
    };
  });
  return NextResponse.json({ month: getMonthKey(date), summary: result });
}

