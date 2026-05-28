import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DateTime } from "luxon";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = DateTime.now();
  const trends = [];

  // Get data for the last 6 months
  for (let i = 5; i >= 0; i--) {
    const monthDate = now.minus({ months: i });
    const startOfMonth = monthDate.startOf("month").toJSDate();
    const endOfMonth = monthDate.endOf("month").toJSDate();

    const result = await prisma.transaction.aggregate({
      where: {
        account: { userId: session.userId },
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        status: {
          in: ["categorized", "needs_review"], // Only count potentially relevant spending
        },
        isTransfer: false, // Don't count transfers as spending
        amountSpendNormalized: {
          gt: 0, // Only count expenses, not refunds/income
        }
      },
      _sum: {
        amountSpendNormalized: true,
      },
    });

    trends.push({
      month: monthDate.toFormat("MMM yyyy"),
      amount: result._sum.amountSpendNormalized || 0,
    });
  }

  return NextResponse.json({ trends });
}
