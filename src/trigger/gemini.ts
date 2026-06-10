import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const geminiTask = task({
  id: "gemini-generate",
  run: async (payload: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    imageUrls?: string[];
    temperature?: number;
    maxTokens?: number;
  }) => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    }

    // Retired/paid-only model IDs from older saved workflows map to free-tier equivalents
    const MODEL_ALIASES: Record<string, string> = {
      "gemini-1.5-pro": "gemini-2.5-flash",
      "gemini-1.5-flash": "gemini-2.5-flash",
      "gemini-2.0-flash": "gemini-2.5-flash",
    };

    const requestedModel = payload.model || "gemini-2.5-flash";
    const resolvedModel = MODEL_ALIASES[requestedModel] ?? requestedModel;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: resolvedModel,
      systemInstruction: payload.systemPrompt || undefined,
      generationConfig: {
        temperature: payload.temperature ?? 0.7,
        maxOutputTokens: payload.maxTokens ?? 2048,
      },
    });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: payload.prompt }];

    if (payload.imageUrls?.length) {
      for (const url of payload.imageUrls) {
        if (url.startsWith("data:")) {
          const match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: { mimeType: match[1], data: match[2] },
            });
          }
        } else {
          const imgRes = await fetch(url);
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const contentType =
            imgRes.headers.get("content-type") ?? "image/jpeg";
          parts.push({
            inlineData: {
              mimeType: contentType,
              data: buffer.toString("base64"),
            },
          });
        }
      }
    }

    const result = await model.generateContent(parts);
    const text = result.response.text();

    return { response: text };
  },
});
