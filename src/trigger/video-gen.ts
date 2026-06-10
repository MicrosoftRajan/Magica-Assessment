import { task } from "@trigger.dev/sdk/v3";

interface VeoOperation {
  name?: string;
  done?: boolean;
  error?: { message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: { video?: { uri?: string } }[];
    };
  };
}

/**
 * Video generation via Google's Veo API (predictLongRunning).
 * Requires a billing-enabled API key; free-tier keys will get a clear error.
 */
export const videoGenTask = task({
  id: "video-generate",
  run: async (payload: {
    prompt: string;
    firstFrameImage?: string;
    durationSeconds?: number;
    aspectRatio?: string;
    generateAudio?: boolean;
    model?: string;
  }) => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    }

    const model = payload.model || "veo-3.1-fast-generate-preview";
    const base = "https://generativelanguage.googleapis.com/v1beta";

    const instance: Record<string, unknown> = { prompt: payload.prompt };
    if (payload.firstFrameImage) {
      const match = payload.firstFrameImage.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        instance.image = { mimeType: match[1], bytesBase64Encoded: match[2] };
      } else {
        const res = await fetch(payload.firstFrameImage);
        const buffer = Buffer.from(await res.arrayBuffer());
        instance.image = {
          mimeType: res.headers.get("content-type") ?? "image/jpeg",
          bytesBase64Encoded: buffer.toString("base64"),
        };
      }
    }

    const startRes = await fetch(
      `${base}/models/${model}:predictLongRunning?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [instance],
          parameters: {
            aspectRatio: payload.aspectRatio ?? "16:9",
            durationSeconds: payload.durationSeconds ?? 5,
            generateAudio: payload.generateAudio ?? true,
          },
        }),
      },
    );

    if (!startRes.ok) {
      const err = await startRes.json().catch(() => null);
      const message = err?.error?.message ?? `HTTP ${startRes.status}`;
      if (startRes.status === 404 || startRes.status === 429) {
        throw new Error(
          `Video generation unavailable on this API key (${message}). Veo models require a billing-enabled Google AI key.`,
        );
      }
      throw new Error(`Veo request failed: ${message}`);
    }

    const operation = (await startRes.json()) as VeoOperation;
    if (!operation.name) throw new Error("Veo did not return an operation");

    // Poll the long-running operation (up to ~5 minutes)
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(`${base}/${operation.name}?key=${apiKey}`);
      const status = (await pollRes.json()) as VeoOperation;

      if (status.error) {
        throw new Error(`Veo generation failed: ${status.error.message}`);
      }
      if (status.done) {
        const uri =
          status.response?.generateVideoResponse?.generatedSamples?.[0]?.video
            ?.uri;
        if (!uri) throw new Error("Veo finished but returned no video");
        // The file URI needs the API key appended for download access
        return { video: `${uri}&key=${apiKey}` };
      }
    }

    throw new Error("Video generation timed out after 5 minutes");
  },
});
