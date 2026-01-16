import { DateTime } from "luxon";
import { prisma } from "./prisma";

export function getMonthKey(date: Date) {
  const dt = DateTime.fromJSDate(date, { zone: "Asia/Kolkata" });
  return { month: dt.month, year: dt.year, label: dt.toFormat("LLLL yyyy") };
}

export async function aggregateMonthTotals(date: Date) {
  const { month, year } = getMonthKey(date);
  const start = DateTime.fromObject({ year, month, day: 1 }, { zone: "Asia/Kolkata" }).startOf("day");
  const end = start.endOf("month");

  const txns = await prisma.transaction.findMany({
    where: {
      date: { gte: start.toJSDate(), lte: end.toJSDate() },
      pending: false,
      status: { notIn: ["ignored", "transfer", "removed"] },
    },
  });

  return computeTotalsFromTransactions(txns);
}

export function computeTotalsFromTransactions(
  txns: Array<{ category: string | null; amountSpendNormalized: number }>,
) {
  const totals = new Map<string, number>();
  for (const t of txns) {
    if (!t.category) continue;
    const current = totals.get(t.category) || 0;
    totals.set(t.category, current + t.amountSpendNormalized);
  }
  return totals;
}

