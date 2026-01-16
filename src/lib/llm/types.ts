import { z } from "zod";

export const LLMResponseSchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning_short: z.string().max(120),
  is_transfer: z.boolean(),
  suggested_rule: z.object({
    create_rule: z.boolean(),
    pattern: z.string().optional(),
    pattern_type: z.enum(["substring", "regex"]).optional(),
    category: z.string().optional(),
  }),
});

export type LLMResult = z.infer<typeof LLMResponseSchema>;

export type Categorizer = (input: {
  merchant?: string | null;
  description: string;
  amount: number;
  categories: string[];
}) => Promise<LLMResult>;

