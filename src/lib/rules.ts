import { prisma } from "./prisma";
import { RulePatternType } from "../generated/prisma/enums";

export type RuleMatch = {
  category: string;
  ruleId: string;
};

export async function getEnabledRules() {
  return prisma.rule.findMany({
    where: { enabled: true },
    orderBy: { priority: "desc" },
  });
}

export function matchRule(
  rules: Awaited<ReturnType<typeof getEnabledRules>>,
  merchant?: string,
  description?: string,
): RuleMatch | null {
  const haystack = `${merchant || ""} ${description || ""}`.toLowerCase();
  for (const rule of rules) {
    if (rule.patternType === RulePatternType.substring) {
      if (haystack.includes(rule.pattern.toLowerCase())) {
        return { category: rule.category, ruleId: rule.id };
      }
    } else {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(haystack)) {
          return { category: rule.category, ruleId: rule.id };
        }
      } catch (err) {
        // ignore invalid regex but keep scanning
      }
    }
  }
  return null;
}

