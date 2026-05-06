import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const updateSubscriptionSchema = z.object({
  name: z.string().min(1).optional(),
  merchant: z.string().nullable().optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(["monthly", "yearly", "weekly"]).optional(),
  category: z.string().nullable().optional(),
  active: z.boolean().optional(),
  nextDueDate: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id, userId: session.userId },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const json = await req.json();
    const body = updateSubscriptionSchema.parse(json);

    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...body,
        nextDueDate: body.nextDueDate !== undefined ? (body.nextDueDate ? new Date(body.nextDueDate) : null) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "subscription_updated",
        payload: updatedSubscription,
      },
    });

    return NextResponse.json({ subscription: updatedSubscription });
  } catch {
    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id, userId: session.userId },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.subscription.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "subscription_deleted",
        payload: { id },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}
