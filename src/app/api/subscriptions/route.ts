import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const createSubscriptionSchema = z.object({
  name: z.string().min(1),
  merchant: z.string().nullable().optional(),
  amount: z.number().positive(),
  frequency: z.enum(["monthly", "yearly", "weekly"]),
  category: z.string().nullable().optional(),
  active: z.boolean().default(true),
  nextDueDate: z.string().nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ subscriptions });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const body = createSubscriptionSchema.parse(json);

    const subscription = await prisma.subscription.create({
      data: {
        userId: session.userId,
        name: body.name,
        merchant: body.merchant,
        amount: body.amount,
        frequency: body.frequency,
        category: body.category,
        active: body.active,
        nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "subscription_created",
        payload: subscription,
      },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 }
    );
  }
}
