import { google } from "googleapis";
import { prisma } from "./prisma";
import { DateTime } from "luxon";
import { decrypt, encrypt } from "./encryption";
import { CATEGORY_BUDGETS } from "./constants";
import { aggregateMonthTotals, getMonthKey } from "./aggregation";

export function buildCategoryRowMap(rows: any[][]) {
  const map = new Map<string, number>();
  rows.forEach((row, idx) => {
    const label = row[0];
    if (label) map.set(label, idx);
  });
  return map;
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars missing");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const client = getOAuthClient();
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  return client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
}

export async function storeGoogleToken(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Missing refresh token from Google");
  }
  const encrypted = encrypt(tokens.refresh_token);
  await prisma.sheetConfig.upsert({
    where: { id: "singleton" },
    update: { googleRefreshToken: encrypted },
    create: {
      id: "singleton",
      spreadsheetId: "REPLACE_ME",
      googleRefreshToken: encrypted,
    },
  });
}

async function getSheetsClient() {
  const cfg = await prisma.sheetConfig.findFirst();
  if (!cfg || !cfg.googleRefreshToken) {
    throw new Error("Google not connected");
  }
  const refreshToken = decrypt(cfg.googleRefreshToken);
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return google.sheets({ version: "v4", auth: client });
}

function monthSheetName(date: Date) {
  const dt = DateTime.fromJSDate(date);
  return dt.toFormat("LLLL yyyy");
}

export async function updateRunningBalance({
  bank,
  cc1,
  cc2,
}: {
  bank: number;
  cc1: number;
  cc2: number;
}) {
  const cfg = await prisma.sheetConfig.findFirst();
  if (!cfg) throw new Error("Sheet config missing");
  const sheets = await getSheetsClient();
  const sheetName = cfg.runningBalanceSheetName;
  const cells = cfg.runningBalanceCells as Record<string, string>;
  
  // PRD Contract: Write only B2 (bank), D2 (cc1), D4 (cc2)
  // NEVER write D3 - it contains formulas that must be preserved
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: cfg.spreadsheetId,
    requestBody: {
      data: [
        {
          range: `${sheetName}!${cells.bank || "B2"}`,
          values: [[bank]],
        },
        {
          range: `${sheetName}!${cells.cc1 || "D2"}`,
          values: [[cc1]],
        },
        {
          range: `${sheetName}!${cells.cc2 || "D4"}`,
          values: [[cc2]],
        },
        // D3 is intentionally excluded - contains formulas, never overwrite
      ],
      valueInputOption: "RAW",
    },
  });
}

async function ensureMonthlySheetExists(spreadsheetId: string, sheetName: string) {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
  if (existing) return;
  // create sheet with categories and SUM row
  const categories = CATEGORY_BUDGETS.map((c) => c.name);
  const addSheetResponse = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });
  const newSheetId = addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (!newSheetId) throw new Error("Failed to create sheet");
  
  const values = categories.map((c) => [c, ""]);
  values.push(["SUM", "=SUM(B1:B49)"]);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1:B${values.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

export async function updateMonthlySheet(date: Date) {
  const cfg = await prisma.sheetConfig.findFirst();
  if (!cfg) throw new Error("Sheet config missing");
  const sheets = await getSheetsClient();
  const sheetName = monthSheetName(date);
  await ensureMonthlySheetExists(cfg.spreadsheetId, sheetName);

  const range = cfg.monthlyReadRange || "A1:B50";
  const data = await sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range: `${sheetName}!${range}`,
  });
  const rows = data.data.values || [];
  const map = buildCategoryRowMap(rows);

  const totals = await aggregateMonthTotals(date);
  const updates: { range: string; values: any[][] }[] = [];
  totals.forEach((value, category) => {
    const rowIdx = map.get(category);
    if (rowIdx === undefined) return;
    const label = rows[rowIdx]?.[0];
    if (label === "SUM") return;
    const targetRow = rowIdx + 1; // 1-indexed for Sheets
    updates.push({
      range: `${sheetName}!B${targetRow}`,
      values: [[value]],
    });
  });

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: cfg.spreadsheetId,
      requestBody: {
        data: updates,
        valueInputOption: "RAW",
      },
    });
  }
}

export async function pushAllToSheets({
  bank,
  cc1,
  cc2,
  date,
}: {
  bank: number;
  cc1: number;
  cc2: number;
  date: Date;
}) {
  await updateRunningBalance({ bank, cc1, cc2 });
  await updateMonthlySheet(date);
  await prisma.auditLog.create({
    data: {
      eventType: "sheets_push",
      payload: { date: getMonthKey(date), bank, cc1, cc2 },
    },
  });
}

