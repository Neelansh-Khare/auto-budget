import { NextResponse } from "next/server";
import { testSheetsConnection } from "@/lib/sheets";

export async function POST() {
  try {
    const result = await testSheetsConnection();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
