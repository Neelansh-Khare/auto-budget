import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { v4 as uuidv4 } from 'uuid';
import { AccountProvider, AccountType, TransactionStatus } from "@prisma/client";
import { Buffer } from 'buffer'; // Add this import

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
  // Assuming 'Debit' column means positive expense, 'Credit' means negative expense (income/refund)
  // Or if only one 'Amount' column, assume positive is expense, negative is income/refund
  if (typeStr && typeStr.toLowerCase() === "credit") {
    amount = -Math.abs(amount); // Ensure credit is negative
  } else {
    amount = Math.abs(amount); // Ensure debit/expense is positive
  }

  return amount;
}


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer.toString());

    const transactions: any[] = [];
    let accountId: string;

    // Ensure a CSV account exists or create one
    let csvAccount = await prisma.account.findFirst({
      where: { provider: AccountProvider.csv },
    });

    if (!csvAccount) {
      csvAccount = await prisma.account.create({
        data: {
          provider: AccountProvider.csv,
          providerAccountId: uuidv4(), // Unique ID for this CSV account
          name: "Manual CSV Account",
          type: AccountType.other,
          balanceCurrent: 0, // Default to 0, can be updated later
        },
      });
    }
    accountId = csvAccount.id;

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row) => {
          let dateStr: string | undefined;
          let descriptionStr: string | undefined;
          let amountStr: string | undefined;
          let merchantStr: string | undefined;
          let typeStr: string | undefined; // For debit/credit parsing

          // Find date
          for (const key of CSV_HEADERS.date) {
            if (row[key]) {
              dateStr = row[key];
              break;
            }
          }
          // Find description
          for (const key of CSV_HEADERS.description) {
            if (row[key]) {
              descriptionStr = row[key];
              break;
            }
          }
          // Find amount and type
          for (const key of CSV_HEADERS.amount) {
            if (row[key] !== undefined && row[key] !== null) {
              // If there are separate debit/credit columns, the one with value is the amount
              if (row[key] !== "") { // Check if the cell has a value
                 amountStr = row[key];
                 typeStr = key; // Use the header as the type
                 break;
              }
            }
          }
          // Find merchant
          for (const key of CSV_HEADERS.merchant) {
            if (row[key]) {
              merchantStr = row[key];
              break;
            }
          }


          if (!dateStr || !descriptionStr || !amountStr) {
            console.warn("Skipping row due to missing essential data:", row);
            return; // Skip rows without essential data
          }

          try {
            const date = new Date(dateStr);
            const amountSpendNormalized = normalizeAmount(amountStr, typeStr);

            transactions.push({
              providerTransactionId: uuidv4(), // Generate unique ID for each CSV transaction
              accountId: accountId,
              date: date,
              amountSpendNormalized: amountSpendNormalized,
              merchant: merchantStr || null,
              description: descriptionStr,
              pending: false, // CSVs are usually settled transactions
              status: TransactionStatus.uncategorized,
              raw: row, // Store original CSV row
            });
          } catch (e: any) {
            console.error("Error processing row:", row, e.message);
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (transactions.length > 0) {
      await prisma.transaction.createMany({
        data: transactions,
        skipDuplicates: true, // In case providerTransactionId clashes, though uuidv4 should prevent
      });
    }

    return NextResponse.json({
      message: `Successfully uploaded ${transactions.length} transactions.`,
      accountId: accountId,
    });
  } catch (error: any) {
    console.error("CSV Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload CSV." }, { status: 500 });
  }
}