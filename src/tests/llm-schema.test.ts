import { describe, it, expect } from "vitest";
import { LLMResponseSchema } from "@/lib/llm/types";

describe("LLM schema", () => {
  it("accepts valid payload", () => {
    const parsed = LLMResponseSchema.safeParse({
      category: "Food",
      confidence: 0.9,
      reasoning_short: "Meal",
      is_transfer: false,
      suggested_rule: {
        create_rule: true,
        pattern: "Chipotle",
        pattern_type: "substring",
        category: "Food",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid confidence", () => {
    const parsed = LLMResponseSchema.safeParse({
      category: "Food",
      confidence: 2,
      reasoning_short: "x",
      is_transfer: false,
      suggested_rule: { create_rule: false },
    });
    expect(parsed.success).toBe(false);
  });
});

