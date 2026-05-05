import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all transactions for the user, grouped by merchant or description
    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: session.userId },
        amountSpendNormalized: { gt: 0 }, // only look at expenses
        isTransfer: false,
        status: { notIn: ["ignored", "removed"] },
      },
      orderBy: { date: "desc" },
    });

    // 2. Group transactions by amount and similar name
    const candidates = new Map<string, typeof transactions>();
    
    for (const t of transactions) {
      const key = `${t.merchant || t.description}_${t.amountSpendNormalized}`;
      if (!candidates.has(key)) {
        candidates.set(key, []);
      }
      candidates.get(key)!.push(t);
    }

    const detectedSubscriptions = [];
    const existingSubscriptions = await prisma.subscription.findMany({
      where: { userId: session.userId },
    });

    const existingKeys = new Set(
      existingSubscriptions.map((s) => `${s.merchant || s.name}_${s.amount}`)
    );

    // 3. Find groups with at least 2 transactions that are ~30 days apart
    for (const [key, group] of candidates.entries()) {
      if (group.length >= 2) {
        // Sort by date descending
        group.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        let isRecurring = false;
        // Check gap between most recent and previous
        for (let i = 0; i < group.length - 1; i++) {
          const gapDays = (group[i].date.getTime() - group[i+1].date.getTime()) / (1000 * 60 * 60 * 24);
          if (gapDays >= 25 && gapDays <= 35) {
            isRecurring = true;
            break;
          }
        }

        if (isRecurring && !existingKeys.has(key)) {
          const t = group[0];
          
          const newSub = await prisma.subscription.create({
            data: {
              userId: session.userId,
              name: t.merchant || t.description || "Unknown Subscription",
              merchant: t.merchant,
              amount: t.amountSpendNormalized,
              frequency: "monthly",
              category: t.category,
              active: true,
            },
          });
          detectedSubscriptions.push(newSub);
          existingKeys.add(key); // Prevent duplicates in the same run
        }
      }
    }

    if (detectedSubscriptions.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          eventType: "subscriptions_detected",
          payload: { count: detectedSubscriptions.length },
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      detectedCount: detectedSubscriptions.length 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to detect subscriptions" },
      { status: 500 }
    );
  }
}
