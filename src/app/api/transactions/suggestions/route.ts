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
    
    // Look for previous categorized transactions with same merchant or similar description
    // Get top 3 most frequent categories
    const previous = await prisma.transaction.findMany({
      where: {
        account: { userId: session.userId },
        OR: [
          { merchant: merchant && merchant.length > 2 ? { contains: merchant, mode: "insensitive" } : undefined },
          { description: { contains: description.split(' ').slice(0, 2).join(' '), mode: "insensitive" } }
        ],
        status: "categorized",
        category: { not: null }
      },
      orderBy: { date: "desc" },
      take: 20,
      select: { category: true }
    });

    if (previous.length > 0) {
      // Count frequencies
      const counts: Record<string, number> = {};
      previous.forEach(p => {
        if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
      });
      
      // Sort by frequency and take top 3
      suggestions[id] = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);
    }
  }

  return NextResponse.json({ suggestions });
}
