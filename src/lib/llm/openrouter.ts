import { LLMResponseSchema, Categorizer } from "./types";

export const openRouterCategorizer: Categorizer = async ({
  merchant,
  description,
  amount,
  categories,
}) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) {
    throw new Error("OpenRouter credentials missing");
  }
  const systemPrompt =
    "You are a strict budgeting assistant. You must classify a bank transaction into exactly one category from the provided list. Output ONLY valid JSON matching the schema. Do not include extra keys.";
  const userPrompt = `Categories: ${categories.join(
    ", ",
  )}\nTransaction: ${merchant || description} | amount: ${amount}\nReturn JSON: {"category": "...","confidence":0-1,"reasoning_short":"<=120 chars","is_transfer":true|false,"suggested_rule":{"create_rule":true|false,"pattern":"","pattern_type":"substring|regex","category":""}}`;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content;
  const parsed = LLMResponseSchema.safeParse(
    typeof content === "string" ? JSON.parse(content) : content,
  );
  if (!parsed.success) {
    throw new Error("LLM schema validation failed");
  }
  return parsed.data;
};

