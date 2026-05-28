import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from 'uuid';
import { AccountProvider, AccountType, TransactionStatus } from "@/generated/prisma/enums";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { getSession } from "@/lib/session";
import crypto from 'crypto';

// Define the expected structure of a single transaction from the LLM
const LLMTransactionSchema = z.object({
  date: z.string().describe("Date of the transaction in YYYY-MM-DD format."),
  description: z.string().describe("Detailed description of the transaction."),
  amount: z.number().describe("Transaction amount. Positive for expense, negative for income/refund."),
  merchant: z.string().optional().describe("Name of the merchant, if identifiable."),
});

const LLMTransactionsResponseSchema = z.object({
  transactions: z.array(LLMTransactionSchema).describe("An array of extracted transactions."),
});

function generateStableId(tx: any, userId: string): string {
  const content = JSON.stringify(tx) + userId;
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

    if (!file.type.startsWith("text/plain")) {
        return NextResponse.json({ error: "Only plain text files are currently supported for LLM statement upload." }, { status: 400 });
    }

    const fileContent = await file.text();
    if (!fileContent) {
        return NextResponse.json({ error: "File is empty or content could not be read." }, { status: 400 });
    }

    // Ensure an LLM Imported Account exists or create one for THIS user
    let llmAccount = await prisma.account.findFirst({
      where: { userId, provider: AccountProvider.csv, name: "LLM Imported Account" },
    });

    if (!llmAccount) {
      llmAccount = await prisma.account.create({
        data: {
          userId,
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

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL;
    if (!apiKey || !modelName) {
      return NextResponse.json({ error: "Gemini API credentials not configured." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = `${systemInstruction}\n\n${userMessage}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const llmRawResponse = result.response.text();

    let llmParsedData: z.infer<typeof LLMTransactionsResponseSchema>;
    try {
        llmParsedData = LLMTransactionsResponseSchema.parse(JSON.parse(llmRawResponse));
    } catch (parseError: unknown) {
        console.error("LLM Response Parsing Error:", parseError);
        return NextResponse.json({ error: "Failed to parse LLM response." }, { status: 500 });
    }

    const transactionsToCreate = llmParsedData.transactions.map(tx => ({
        providerTransactionId: generateStableId(tx, userId),
        accountId: accountId,
        date: new Date(tx.date),
        amountSpendNormalized: tx.amount,
        merchant: tx.merchant || null,
        description: tx.description,
        pending: false,
        status: TransactionStatus.uncategorized,
        raw: tx,
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
  } catch (error: unknown) {
    console.error("LLM Statement Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload statement." }, { status: 500 });
  }
}

