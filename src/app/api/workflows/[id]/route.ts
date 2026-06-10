import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { updateWorkflowSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedWorkflow(id: string, userId: string) {
  return db.workflow.findFirst({ where: { id, userId } });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    const workflow = await getOwnedWorkflow(id, userId);

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    const workflow = await getOwnedWorkflow(id, userId);

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateWorkflowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await db.workflow.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.graph !== undefined && {
          graph: parsed.data.graph as Prisma.InputJsonValue,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    const workflow = await getOwnedWorkflow(id, userId);

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.workflow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
