import { geminiCategorizer } from "./gemini";
import { openRouterCategorizer } from "./openrouter";
import { Categorizer, LLMResult } from "./types";

const providers: Record<string, Categorizer> = {
  openrouter: openRouterCategorizer,
  gemini: geminiCategorizer,
};

export async function categorizeWithLLM(
  provider: string,
  input: {
    merchant?: string | null;
    description: string;
    amount: number;
    categories: string[];
  },
): Promise<LLMResult> {
  const handler = providers[provider];
  if (!handler) {
    throw new Error(`Unknown LLM provider ${provider}`);
  }
  return handler(input);
}

