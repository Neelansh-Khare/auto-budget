import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const sheet = await prisma.sheetConfig.findFirst();
  const accounts = await prisma.account.findMany();
  return NextResponse.json({ settings, sheet, accounts });
}

export async function POST(req: Request) {
  const body = await req.json();
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
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
      id: "singleton",
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
      where: { id: "singleton" },
      update: {
        spreadsheetId: body.sheet.spreadsheetId,
        runningBalanceSheetName: body.sheet.runningBalanceSheetName,
        monthlyNameFormat: body.sheet.monthlyNameFormat,
      },
      create: {
        id: "singleton",
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
      await prisma.account.update({
        where: { id: entry.id },
        data: { mappedBalanceRole: entry.role },
      });
    }
  }
  return NextResponse.json({ settings });
}

