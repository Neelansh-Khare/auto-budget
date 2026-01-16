import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateMonthTotals, getMonthKey } from "@/lib/aggregation";
import { pushAllToSheets } from "@/lib/sheets";
import { CATEGORY_BUDGETS } from "@/lib/constants";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { category, status, create_rule } = body;

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!tx) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      category: category ?? tx.category,
      status: status ?? tx.status,
      needsReview: status === "needs_review",
      categorizationSource: "manual",
    },
  });

  if (create_rule && category) {
    await prisma.rule.create({
      data: {
        name: `${tx.merchant || tx.description} rule`,
        pattern: tx.merchant || tx.description,
        patternType: "substring",
        category,
        priority: 1,
      },
    });
  }

  // recompute month totals
  await aggregateMonthTotals(new Date(updated.date));

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (settings?.autoPushToSheets) {
    const accounts = await prisma.account.findMany();
    const bankBalance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "bank")?.balanceCurrent ?? 0;
    const cc1Balance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "cc1")?.balanceCurrent ?? 0;
    const cc2Balance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "cc2")?.balanceCurrent ?? 0;
    await pushAllToSheets({ bank: bankBalance, cc1: cc1Balance, cc2: cc2Balance, date: new Date(updated.date) });
  }

  await prisma.auditLog.create({
    data: {
      eventType: "transaction_updated",
      payload: { id: params.id, category, status, month: getMonthKey(new Date(updated.date)) },
    },
  });

  return NextResponse.json({ ok: true });
}

