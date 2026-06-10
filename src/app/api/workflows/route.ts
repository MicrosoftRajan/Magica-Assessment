import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { createWorkflowSchema } from "@/lib/validation";
import {
  createEmptyWorkflowGraph,
  createSampleWorkflowGraph,
  SAMPLE_WORKFLOW_NAME,
} from "@/lib/sample-workflow";

export async function GET() {
  try {
    const userId = await requireUserId();

    const workflows = await db.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        runs: {
          where: { status: "RUNNING" },
          take: 1,
        },
      },
    });

    return NextResponse.json(
      workflows.map((w) => ({
        id: w.id,
        name: w.name,
        updatedAt: w.updatedAt,
        createdAt: w.createdAt,
        isRunning: w.runs.length > 0,
      })),
    );
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const parsed = createWorkflowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const graph = parsed.data.isSample
      ? createSampleWorkflowGraph()
      : parsed.data.graph ?? createEmptyWorkflowGraph();

    const workflow = await db.workflow.create({
      data: {
        userId,
        name: parsed.data.name ?? (parsed.data.isSample ? SAMPLE_WORKFLOW_NAME : "Untitled Workflow"),
        graph: graph as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
