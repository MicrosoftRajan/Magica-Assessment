import { task, wait } from "@trigger.dev/sdk/v3";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

export const cropImageTask = task({
  id: "crop-image",
  run: async (payload: {
    imageUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    const startTime = Date.now();

    const tmpDir = await mkdtemp(join(tmpdir(), "nextflow-crop-"));
    const inputPath = join(tmpDir, "input.jpg");
    const outputPath = join(tmpDir, "output.jpg");

    try {
      const response = await fetch(payload.imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(inputPath, buffer);

      const probeResult = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0",
        inputPath,
      ]);

      const [imgWidth, imgHeight] = probeResult.stdout
        .trim()
        .split(",")
        .map(Number);

      const cropX = Math.round((payload.x / 100) * imgWidth);
      const cropY = Math.round((payload.y / 100) * imgHeight);
      const cropW = Math.round((payload.width / 100) * imgWidth);
      const cropH = Math.round((payload.height / 100) * imgHeight);

      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-vf",
        `crop=${cropW}:${cropH}:${cropX}:${cropY}`,
        outputPath,
      ]);

      const outputBuffer = await readFile(outputPath);
      const base64 = outputBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      const elapsed = Date.now() - startTime;
      const minDelay = 30000;
      if (elapsed < minDelay) {
        await wait.for({ seconds: Math.ceil((minDelay - elapsed) / 1000) });
      }

      return { outputUrl: dataUrl };
    } finally {
      await Promise.allSettled([
        unlink(inputPath).catch(() => {}),
        unlink(outputPath).catch(() => {}),
      ]);
    }
  },
});
