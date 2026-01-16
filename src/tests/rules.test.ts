import { describe, it, expect } from "vitest";
import { matchRule } from "@/lib/rules";

describe("rules engine", () => {
  const rules = [
    {
      id: "1",
      name: "food",
      pattern: "mcdonald",
      patternType: "substring",
      category: "Food",
      priority: 1,
      enabled: true,
      createdAt: new Date(),
    },
  ] as any;

  it("matches substring ignoring case", () => {
    const res = matchRule(rules, "McDonalds", "McDonalds #123");
    expect(res?.category).toBe("Food");
  });

  it("returns null when no rule hits", () => {
    const res = matchRule(rules, "Starbucks", "Coffee");
    expect(res).toBeNull();
  });
});

