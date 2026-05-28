import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { v4 as uuidv4 } from 'uuid';
import { AccountProvider, AccountType, TransactionStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma";
import { Buffer } from 'buffer';
import { getSession } from "@/lib/session";
import crypto from 'crypto';

// Define expected CSV headers and their mapping to Transaction fields
const CSV_HEADERS = {
  date: ["Date", "Transaction Date"],
  description: ["Description", "Payee", "Transaction"],
  amount: ["Amount", "Debit", "Credit"], // Will need logic to handle debit/credit or sign
  merchant: ["Merchant"], // Optional
};

// Helper to normalize amount (positive for expense)
function normalizeAmount(amountStr: string, typeStr?: string): number {
  let amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, "")); // Remove currency symbols, etc.

  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }

  // Basic logic for debit/credit columns or amount sign
  if (typeStr && typeStr.toLowerCase() === "credit") {
    amount = -Math.abs(amount);
  } else {
    amount = Math.abs(amount);
  }

  return amount;
}

function generateStableId(row: any, userId: string): string {
  const content = JSON.stringify(row) + userId;
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.userId;

    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer.toString());

    const transactions: Array<{
      providerTransactionId: string;
      accountId: string;
      date: Date;
      amountSpendNormalized: number;
      merchant: string | null;
      description: string;
      pending: boolean;
      status: TransactionStatus;
      raw: Prisma.InputJsonValue;
    }> = [];

    // Ensure a CSV account exists or create one for THIS user
    let csvAccount = await prisma.account.findFirst({
      where: { userId, provider: AccountProvider.csv, name: "Manual CSV Account" },
    });

    if (!csvAccount) {
      csvAccount = await prisma.account.create({
        data: {
          userId,
          provider: AccountProvider.csv,
          providerAccountId: uuidv4(),
          name: "Manual CSV Account",
          type: AccountType.other,
          balanceCurrent: 0,
        },
      });
    }
    const accountId = csvAccount.id;

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row) => {
          let dateStr: string | undefined;
          let descriptionStr: string | undefined;
          let amountStr: string | undefined;
          let merchantStr: string | undefined;
          let typeStr: string | undefined;

          for (const key of CSV_HEADERS.date) {
            if (row[key]) {
              dateStr = row[key];
              break;
            }
          }
          for (const key of CSV_HEADERS.description) {
            if (row[key]) {
              descriptionStr = row[key];
              break;
            }
          }
          for (const key of CSV_HEADERS.amount) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
              amountStr = row[key];
              typeStr = key;
              break;
            }
          }
          for (const key of CSV_HEADERS.merchant) {
            if (row[key]) {
              merchantStr = row[key];
              break;
            }
          }

          if (!dateStr || !descriptionStr || !amountStr) return;

          try {
            const date = new Date(dateStr);
            const amountSpendNormalized = normalizeAmount(amountStr, typeStr);

            transactions.push({
              providerTransactionId: generateStableId(row, userId),
              accountId: accountId,
              date: date,
              amountSpendNormalized: amountSpendNormalized,
              merchant: merchantStr || null,
              description: descriptionStr,
              pending: false,
              status: TransactionStatus.uncategorized,
              raw: row as Prisma.InputJsonValue,
            });
          } catch (e: unknown) {
            console.error("Error processing row:", row, e);
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (transactions.length > 0) {
      await prisma.transaction.createMany({
        data: transactions,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      message: `Successfully processed ${transactions.length} transactions.`,
      accountId: accountId,
    });
  } catch (error: unknown) {
    console.error("CSV Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload CSV." }, { status: 500 });
  }
}