import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import crypto from "node:crypto";

export async function GET() {
  try {
    await requireUserId();

    const authKey = process.env.TRANSLOADIT_AUTH_KEY;
    const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

    if (!authSecret) {
      return NextResponse.json(
        { error: "Transloadit not configured" },
        { status: 503 },
      );
    }

    // Transloadit expects "YYYY/MM/DD HH:mm:ss+00:00"
    const expires =
      new Date(Date.now() + 3600000)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "") + "+00:00";
    const params = JSON.stringify({
      auth: {
        key: authKey,
        expires,
      },
      steps: {
        ":original": {
          robot: "/upload/handle",
        },
        exported: {
          use: ":original",
          robot: "/image/resize",
          width: 2048,
          height: 2048,
          resize_strategy: "fit",
          format: "jpg",
        },
      },
    });

    // Non-SHA1 algorithms must be prefixed with the algorithm name
    const signature =
      "sha384:" +
      crypto.createHmac("sha384", authSecret).update(params).digest("hex");

    return NextResponse.json({ params, signature });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
