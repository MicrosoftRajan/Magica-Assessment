import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function urlToInlineData(
  url: string,
): Promise<{ mimeType: string; data: string } | null> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    return match ? { mimeType: match[1], data: match[2] } : null;
  }
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    mimeType: res.headers.get("content-type") ?? "image/jpeg",
    data: buffer.toString("base64"),
  };
}

export const imageGenTask = task({
  id: "image-generate",
  run: async (payload: {
    prompt: string;
    inputImage?: string;
    model?: string;
  }) => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: payload.model || "gemini-2.5-flash-image",
    });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: payload.prompt }];

    if (payload.inputImage) {
      const inline = await urlToInlineData(payload.inputImage);
      if (inline) parts.push({ inlineData: inline });
    }

    const result = await model.generateContent(parts);
    const candidates = result.response.candidates ?? [];
    const images: string[] = [];
    let text = "";

    for (const candidate of candidates) {
      for (const part of candidate.content?.parts ?? []) {
        if ("inlineData" in part && part.inlineData) {
          images.push(
            `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          );
        } else if ("text" in part && part.text) {
          text += part.text;
        }
      }
    }

    if (images.length === 0) {
      throw new Error(
        text
          ? `Model returned no image: ${text.slice(0, 200)}`
          : "Model returned no image",
      );
    }

    return { images, text };
  },
});
