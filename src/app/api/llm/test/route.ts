import { NextResponse } from "next/server";
import { categorizeWithLLM } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const provider = settings?.llmProvider;
    if (!provider) {
      throw new Error("LLM provider not configured");
    }
    // Simple test with dummy data
    const result = await categorizeWithLLM(provider, {
      description: "TEST TRANSACTION",
      amount: 10.0,
      categories: ["Food", "Transport", "Other"],
    });
    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
