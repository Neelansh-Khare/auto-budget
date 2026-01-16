import { NextResponse } from "next/server";
import { pushAllToSheets } from "@/lib/sheets";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const accounts = await prisma.account.findMany();
    const bankBalance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "bank")?.balanceCurrent ?? 0;
    const cc1Balance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "cc1")?.balanceCurrent ?? 0;
    const cc2Balance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "cc2")?.balanceCurrent ?? 0;
    await pushAllToSheets({ bank: bankBalance, cc1: cc1Balance, cc2: cc2Balance, date: new Date() });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

