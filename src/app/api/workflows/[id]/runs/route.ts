import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;

    const workflow = await db.workflow.findFirst({
      where: { id, userId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const runs = await db.workflowRun.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: "desc" },
      include: {
        nodeRuns: {
          orderBy: { startedAt: "asc" },
        },
      },
      take: 50,
    });

    return NextResponse.json(runs);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
