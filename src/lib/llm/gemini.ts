import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMResponseSchema, Categorizer } from "./types";

export const geminiCategorizer: Categorizer = async ({
  merchant,
  description,
  amount,
  categories,
}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL;
  if (!apiKey || !modelName) {
    throw new Error("Gemini credentials missing");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = `You are a strict budgeting assistant. Return ONLY JSON.
Categories: ${categories.join(", ")}
Transaction: ${merchant || description} amount ${amount}
JSON schema: {"category": "...","confidence":0-1,"reasoning_short":"<=120 chars","is_transfer":true|false,"suggested_rule":{"create_rule":true|false,"pattern":"","pattern_type":"substring|regex","category":""}}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const text = result.response.text();
  const parsed = LLMResponseSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error("LLM schema validation failed");
  }
  return parsed.data;
};

