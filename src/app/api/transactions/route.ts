import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const accountId = url.searchParams.get("account_id") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const search = url.searchParams.get("search");

  const transactions = await prisma.transaction.findMany({
    where: {
      status: status ? (status as any) : undefined,
      category: category || undefined,
      accountId,
      date: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
      OR: search
        ? [
            { merchant: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ transactions });
}

