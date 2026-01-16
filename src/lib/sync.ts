import { prisma } from "./prisma";
import { syncFromPlaid } from "./plaid";
import { matchRule, getEnabledRules } from "./rules";
import { categorizeWithLLM } from "./llm";
import { CATEGORY_BUDGETS } from "./constants";
import { pushAllToSheets } from "./sheets";
import { getMonthKey, aggregateMonthTotals } from "./aggregation";
import { TransactionStatus } from "../generated/prisma/enums";

export async function performSync({ pushToSheets }: { pushToSheets?: boolean } = {}) {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const accessTokenEnc = settings.plaidAccessTokenEnc;
  if (!accessTokenEnc) {
    throw new Error("Plaid not connected");
  }
  const { decrypt } = await import("./encryption");
  const accessToken = decrypt(accessTokenEnc);

  const anyAccount = await prisma.account.findFirst({ orderBy: { lastSyncedAt: "desc" } });
  const since = anyAccount?.lastSyncedAt ?? undefined;

  const plaidData = await syncFromPlaid({ accessToken, since });
  const now = new Date();

  // upsert accounts
  for (const acc of plaidData.accounts) {
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "plaid", providerAccountId: acc.account_id } },
      update: {
        name: acc.name || acc.official_name || acc.mask || "Account",
        type: acc.type === "credit" ? "credit" : acc.type === "depository" ? "depository" : "other",
        balanceCurrent: acc.balances.current ?? 0,
        balanceAvailable: acc.balances.available ?? null,
        lastSyncedAt: now,
      },
      create: {
        provider: "plaid",
        providerAccountId: acc.account_id,
        name: acc.name || acc.official_name || acc.mask || "Account",
        type: acc.type === "credit" ? "credit" : acc.type === "depository" ? "depository" : "other",
        balanceCurrent: acc.balances.current ?? 0,
        balanceAvailable: acc.balances.available ?? null,
        lastSyncedAt: now,
      },
    });
  }

  const rules = await getEnabledRules();
  let ingested = 0;
  let needsReviewCount = 0;
  let categorized = 0;

  for (const t of plaidData.transactions) {
    // Plaid: negative = expense, positive = credit/refund
    // We normalize: positive = expense, negative = refund
    const normalized = -t.amount;
    const account = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: "plaid", providerAccountId: t.account_id } },
    });
    if (!account) continue;

    const existing = await prisma.transaction.findUnique({
      where: { providerTransactionId: t.transaction_id },
    });
    if (existing) continue;

    const ruleMatch = matchRule(rules, t.merchant_name || undefined, t.name || undefined);
    let category: string | null = null;
    let status: TransactionStatus = TransactionStatus.uncategorized;
    let confidence: number | null = null;
    let needsReview = false;
    let source: "rule" | "llm" | "manual" | null = null;
    let isTransfer = false;

    if (ruleMatch) {
      category = ruleMatch.category;
      status = TransactionStatus.categorized;
      source = "rule";
    } else if (settings.llmEnabled && settings.llmProvider) {
      try {
        const llmResult = await categorizeWithLLM(settings.llmProvider, {
          merchant: t.merchant_name,
          description: t.name,
          amount: normalized,
          categories: CATEGORY_BUDGETS.map((c) => c.name),
        });
        category = llmResult.category;
        confidence = llmResult.confidence;
        isTransfer = llmResult.is_transfer;
        if (isTransfer) {
          status = TransactionStatus.transfer;
        } else if (confidence >= (settings.confidenceThreshold || 0.8)) {
          status = TransactionStatus.categorized;
        } else {
          status = TransactionStatus.needs_review;
          needsReview = true;
        }
        source = "llm";
        
        // Auto-create rule if LLM suggests it
        if (llmResult.suggested_rule?.create_rule && llmResult.suggested_rule.pattern && llmResult.suggested_rule.category) {
          try {
            await prisma.rule.create({
              data: {
                name: `Auto-rule: ${llmResult.suggested_rule.pattern}`,
                pattern: llmResult.suggested_rule.pattern,
                patternType: llmResult.suggested_rule.pattern_type || "substring",
                category: llmResult.suggested_rule.category,
                priority: 1,
                enabled: true,
              },
            });
            await prisma.auditLog.create({
              data: {
                eventType: "rule_auto_created",
                payload: {
                  pattern: llmResult.suggested_rule.pattern,
                  category: llmResult.suggested_rule.category,
                  transaction_id: t.transaction_id,
                },
              },
            });
          } catch (err) {
            // Rule might already exist or pattern invalid - ignore
            console.warn("Failed to auto-create rule:", err);
          }
        }
      } catch (err) {
        status = TransactionStatus.needs_review;
        needsReview = true;
      }
    } else {
      status = TransactionStatus.needs_review;
      needsReview = true;
    }

    await prisma.transaction.create({
      data: {
        providerTransactionId: t.transaction_id,
        accountId: account.id,
        date: new Date(t.date),
        amountSpendNormalized: normalized,
        merchant: t.merchant_name,
        description: t.name,
        pending: t.pending ?? false,
        category,
        confidence,
        status,
        categorizationSource: source,
        needsReview,
        isTransfer,
        raw: t as any,
      },
    });
    ingested += 1;
    if (needsReview) needsReviewCount += 1;
    if (status === TransactionStatus.categorized) categorized += 1;
  }

  // recompute month totals
  const monthTotals = await aggregateMonthTotals(now);

  if (pushToSheets || settings.autoPushToSheets) {
    const accounts = await prisma.account.findMany();
    const bankBalance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "bank")?.balanceCurrent ?? 0;
    const cc1Balance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "cc1")?.balanceCurrent ?? 0;
    const cc2Balance = accounts.find((a: { mappedBalanceRole: string | null }) => a.mappedBalanceRole === "cc2")?.balanceCurrent ?? 0;
    await pushAllToSheets({ bank: bankBalance, cc1: cc1Balance, cc2: cc2Balance, date: now });
  }

  await prisma.auditLog.create({
    data: {
      eventType: "sync_complete",
      payload: {
        ingested,
        categorized,
        needsReview: needsReviewCount,
        month: getMonthKey(now),
        totals: Object.fromEntries(monthTotals),
      },
    },
  });

  return { ingested, categorized, needsReview: needsReviewCount };
}

