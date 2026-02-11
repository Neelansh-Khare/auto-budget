import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from 'uuid';
import { AccountProvider, AccountType, TransactionStatus } from "@prisma/client";
import { getLLMResponse } from "@/lib/llm";
import { z } from "zod";
import { Buffer } from 'buffer'; // Add this import

// Define the expected structure of a single transaction from the LLM
const LLMTransactionSchema = z.object({
  date: z.string().describe("Date of the transaction in YYYY-MM-DD format."),
  description: z.string().describe("Detailed description of the transaction."),
  amount: z.number().describe("Transaction amount. Positive for expense, negative for income/refund."),
  merchant: z.string().optional().describe("Name of the merchant, if identifiable."),
});

// Define the schema for the LLM's full response (an array of transactions)
const LLMTransactionsResponseSchema = z.object({
  transactions: z.array(LLMTransactionSchema).describe("An array of extracted transactions."),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!file.type.startsWith("text/plain")) {
        return NextResponse.json({ error: "Only plain text files are currently supported for LLM statement upload." }, { status: 400 });
    }

    const fileContent = await file.text();

    if (!fileContent) {
        return NextResponse.json({ error: "File is empty or content could not be read." }, { status: 400 });
    }

    // Ensure an LLM Imported Account exists or create one
    let llmAccount = await prisma.account.findFirst({
      where: { provider: AccountProvider.csv, name: "LLM Imported Account" }, // Reusing 'csv' provider for now
    });

    if (!llmAccount) {
      llmAccount = await prisma.account.create({
        data: {
          provider: AccountProvider.csv,
          providerAccountId: uuidv4(),
          name: "LLM Imported Account",
          type: AccountType.other,
          balanceCurrent: 0,
        },
      });
    }
    const accountId = llmAccount.id;

    // --- LLM Integration ---
    const systemInstruction = `You are an expert financial assistant. Your task is to extract transaction details from a bank or credit card statement. Identify the date, description, amount, and merchant for each transaction. Amounts should be numbers, positive for expenses/debits, and negative for income/credits/refunds. Return the data as a JSON array of transactions. If a merchant is not explicitly mentioned, you can infer it from the description or leave it null.`;

    const userMessage = `Extract all transactions from the following statement text and format them as a JSON array. Ensure the date is in YYYY-MM-DD format and the amount is a number (positive for expenses, negative for income).
    
    Statement:
    ${fileContent}
    
    JSON Output:`;

    const llmRawResponse = await getLLMResponse({
        systemInstruction: systemInstruction,
        userMessage: userMessage,
        // Assuming getLLMResponse can take a zod schema for output validation
        // If not, we'll parse and validate the string response ourselves
    });

    let llmParsedData: z.infer<typeof LLMTransactionsResponseSchema>;
    try {
        // Assuming llmRawResponse is already the JSON string from the LLM
        // If getLLMResponse returns a structured object, this step might change
        llmParsedData = LLMTransactionsResponseSchema.parse(JSON.parse(llmRawResponse));
    } catch (parseError: any) {
        console.error("LLM Response Parsing Error:", parseError);
        return NextResponse.json({ error: "Failed to parse LLM response.", details: parseError.message }, { status: 500 });
    }

    const transactionsToCreate = llmParsedData.transactions.map(tx => ({
        providerTransactionId: uuidv4(),
        accountId: accountId,
        date: new Date(tx.date),
        amountSpendNormalized: tx.amount,
        merchant: tx.merchant || null,
        description: tx.description,
        pending: false,
        status: TransactionStatus.uncategorized,
        raw: tx, // Store original LLM extracted data
    }));

    if (transactionsToCreate.length > 0) {
      await prisma.transaction.createMany({
        data: transactionsToCreate,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      message: `Successfully processed statement and extracted ${transactionsToCreate.length} transactions.`,
      accountId: accountId,
    });
  } catch (error: any) {
    console.error("LLM Statement Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload statement for LLM processing." }, { status: 500 });
  }
}
