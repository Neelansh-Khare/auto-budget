import { NextResponse } from "next/server";
import { aggregateMonthTotals, getMonthKey } from "@/lib/aggregation";
import { CATEGORY_BUDGETS } from "@/lib/constants";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const date = month ? new Date(month) : new Date();
  const totals = await aggregateMonthTotals(date, session.userId);
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

