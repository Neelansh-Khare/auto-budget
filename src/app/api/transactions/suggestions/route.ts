import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactions } = await req.json();
  if (!Array.isArray(transactions)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const suggestions: Record<string, string[]> = {};

  for (const tx of transactions) {
    const { merchant, description, id } = tx;
    
    // Look for previous categorized transactions with same merchant or description
    const previous = await prisma.transaction.findFirst({
      where: {
        account: { userId: session.userId },
        OR: [
          { merchant: merchant || undefined },
          { description: { contains: description.split(' ').slice(0, 3).join(' '), mode: "insensitive" } }
        ],
        status: "categorized",
        category: { not: null }
      },
      orderBy: { date: "desc" },
      select: { category: true }
    });

    if (previous?.category) {
      suggestions[id] = [previous.category];
    }
  }

  return NextResponse.json({ suggestions });
}
