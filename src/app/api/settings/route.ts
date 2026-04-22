import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.settings.findUnique({ where: { userId: session.userId } });
  const sheet = await prisma.sheetConfig.findUnique({ where: { userId: session.userId } });
  const accounts = await prisma.account.findMany({ where: { userId: session.userId } });
  
  return NextResponse.json({
    settings,
    sheet,
    accounts,
    isPlaidConnected: !!settings?.plaidAccessTokenEnc,
    isGoogleConnected: !!sheet?.googleRefreshToken,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const settings = await prisma.settings.upsert({
    where: { userId: session.userId },
    update: {
      llmEnabled: body.llmEnabled,
      llmProvider: body.llmProvider,
      llmModel: body.llmModel,
      confidenceThreshold: body.confidenceThreshold,
      autoSyncEnabled: body.autoSyncEnabled,
      autoSyncCron: body.autoSyncCron,
      autoPushToSheets: body.autoPushToSheets,
      exportDestination: body.exportDestination || "native",
      authDisabled: body.authDisabled,
    },
    create: {
      userId: session.userId,
      llmEnabled: body.llmEnabled,
      llmProvider: body.llmProvider,
      llmModel: body.llmModel,
      confidenceThreshold: body.confidenceThreshold,
      autoSyncEnabled: body.autoSyncEnabled,
      autoSyncCron: body.autoSyncCron,
      autoPushToSheets: body.autoPushToSheets,
      exportDestination: body.exportDestination || "native",
      authDisabled: body.authDisabled,
    },
  });

  if (body.sheet) {
    await prisma.sheetConfig.upsert({
      where: { userId: session.userId },
      update: {
        spreadsheetId: body.sheet.spreadsheetId,
        runningBalanceSheetName: body.sheet.runningBalanceSheetName,
        monthlyNameFormat: body.sheet.monthlyNameFormat,
      },
      create: {
        userId: session.userId,
        spreadsheetId: body.sheet.spreadsheetId,
        runningBalanceSheetName: body.sheet.runningBalanceSheetName || "Running Balance",
        monthlyNameFormat: body.sheet.monthlyNameFormat || "{Month} {Year}",
        runningBalanceCells: { bank: "B2", cc1: "D2", cc2: "D4" },
        monthlyReadRange: "A1:B50",
      },
    });
  }

  if (body.accountRoles) {
    for (const entry of body.accountRoles) {
      // Ensure the account belongs to the user before updating
      await prisma.account.updateMany({
        where: { id: entry.id, userId: session.userId },
        data: { mappedBalanceRole: entry.role },
      });
    }
  }
  return NextResponse.json({ settings });
}

