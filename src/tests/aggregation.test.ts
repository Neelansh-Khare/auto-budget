import { describe, it, expect } from "vitest";
import { computeTotalsFromTransactions, getMonthKey } from "@/lib/aggregation";

describe("month aggregation helpers", () => {
  it("sums by category", () => {
    const totals = computeTotalsFromTransactions([
      { category: "Food", amountSpendNormalized: 10 },
      { category: "Food", amountSpendNormalized: 5 },
      { category: "Grocery", amountSpendNormalized: 7 },
      { category: null, amountSpendNormalized: 3 },
    ]);
    expect(totals.get("Food")).toBe(15);
    expect(totals.get("Grocery")).toBe(7);
  });

  it("resolves month key in Asia/Kolkata", () => {
    const key = getMonthKey(new Date("2026-01-06T00:10:00Z"));
    expect(key.label).toBe("January 2026");
  });
});

