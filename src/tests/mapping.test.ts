import { describe, it, expect } from "vitest";
import { buildCategoryRowMap } from "@/lib/sheets";

describe("category row mapping", () => {
  it("maps labels to correct rows", () => {
    const rows = [
      ["Food", ""],
      ["SUM", ""],
      ["Grocery", ""],
    ];
    const map = buildCategoryRowMap(rows);
    expect(map.get("Food")).toBe(0);
    expect(map.get("Grocery")).toBe(2);
    expect(map.get("SUM")).toBe(1);
  });
});

