import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateMonthTotals, getMonthKey } from "@/lib/aggregation";
import { pushAllToSheets } from "@/lib/sheets";
import { getSession } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { category, status, create_rule } = body;

  const tx = await prisma.transaction.findFirst({
    where: { id, account: { userId: session.userId } },
  });
  if (!tx) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.transaction.update({
    where: { id },
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
        userId: session.userId,
        name: `${tx.merchant || tx.description} rule`,
        pattern: tx.merchant || tx.description,
        patternType: "substring",
        category,
        priority: 1,
      },
    });
  }

  // recompute month totals
  await aggregateMonthTotals(new Date(updated.date), session.userId);

  const settings = await prisma.settings.findUnique({ where: { userId: session.userId } });
  if (settings?.autoPushToSheets) {
    const accounts = await prisma.account.findMany({
      where: { userId: session.userId }
    });
    const bankBalance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "bank")?.balanceCurrent ?? 0;
    const cc1Balance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "cc1")?.balanceCurrent ?? 0;
    const cc2Balance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "cc2")?.balanceCurrent ?? 0;
    await pushAllToSheets({ bank: bankBalance, cc1: cc1Balance, cc2: cc2Balance, date: new Date(updated.date) });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      eventType: "transaction_updated",
      payload: { id, category, status, month: getMonthKey(new Date(updated.date)) },
    },
  });

  return NextResponse.json({ ok: true });
}

