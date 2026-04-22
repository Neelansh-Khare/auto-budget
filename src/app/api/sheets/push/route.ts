import { NextResponse } from "next/server";
import { pushAllToSheets } from "@/lib/sheets";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await prisma.account.findMany({ where: { userId: session.userId } });
    const bankBalance = accounts.find((a) => a.mappedBalanceRole === "bank")?.balanceCurrent ?? 0;
    const cc1Balance = accounts.find((a) => a.mappedBalanceRole === "cc1")?.balanceCurrent ?? 0;
    const cc2Balance = accounts.find((a) => a.mappedBalanceRole === "cc2")?.balanceCurrent ?? 0;
    await pushAllToSheets({ 
      userId: session.userId, 
      bank: bankBalance, 
      cc1: cc1Balance, 
      cc2: cc2Balance, 
      date: new Date() 
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

