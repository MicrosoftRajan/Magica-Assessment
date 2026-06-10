import { NextResponse } from "next/server";
import type { Edge, Node } from "@xyflow/react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { executeWorkflowSchema } from "@/lib/validation";
import {
  executeWorkflowGraph,
  getNodeLabel,
  seedOutputsFromGraph,
} from "@/lib/execution/engine";
import { getUpstreamNodeIds } from "@/lib/graph-utils";
import { NODE_TYPES } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;

    const workflow = await db.workflow.findFirst({
      where: { id, userId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = executeWorkflowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const graph = workflow.graph as unknown as { nodes: Node[]; edges: Edge[] };
    const { nodes, edges } = graph;

    let targetNodeIds: string[];
    let initialOutputs;

    if (parsed.data.nodeIds?.length) {
      if (parsed.data.scope === "single") {
        targetNodeIds = [...parsed.data.nodeIds];
        // Response nodes are display-only, so refresh any fed directly
        // by the node being run
        const downstreamResponses = edges
          .filter((e) => targetNodeIds.includes(e.source))
          .map((e) => nodes.find((n) => n.id === e.target))
          .filter((n) => n?.type === NODE_TYPES.RESPONSE)
          .map((n) => n!.id);
        targetNodeIds = [...new Set([...targetNodeIds, ...downstreamResponses])];
        initialOutputs = seedOutputsFromGraph(nodes, targetNodeIds);
      } else {
        const upstream = getUpstreamNodeIds(parsed.data.nodeIds, edges);
        targetNodeIds = [...upstream];
      }
    } else {
      targetNodeIds = nodes.map((n) => n.id);
    }

    const scopeMap = {
      full: "FULL",
      partial: "PARTIAL",
      single: "SINGLE",
    } as const;

    const run = await db.workflowRun.create({
      data: {
        workflowId: id,
        status: "RUNNING",
        scope: scopeMap[parsed.data.scope],
        nodeRuns: {
          create: targetNodeIds.map((nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            return {
              nodeId,
              nodeType: node?.type ?? "unknown",
              nodeLabel: node ? getNodeLabel(node) : nodeId,
              status: "PENDING",
            };
          }),
        },
      },
      include: { nodeRuns: true },
    });

    const nodeRunMap = new Map(
      run.nodeRuns.map((nr) => [nr.nodeId, nr.id]),
    );

    let hasFailure = false;
    let successCount = 0;

    try {
      await executeWorkflowGraph(nodes, edges, targetNodeIds, {
        onNodeStart: async (nodeId) => {
          const nodeRunId = nodeRunMap.get(nodeId);
          if (!nodeRunId) return;
          await db.nodeRun.update({
            where: { id: nodeRunId },
            data: { status: "RUNNING", startedAt: new Date() },
          });
        },
        onNodeComplete: async (nodeId, result) => {
          const nodeRunId = nodeRunMap.get(nodeId);
          if (!nodeRunId) return;

          const node = nodes.find((n) => n.id === nodeId);
          let inputs: Prisma.InputJsonValue | undefined;

          if (node?.type === NODE_TYPES.REQUEST_INPUTS) {
            inputs = {
              fields: (node.data as { fields?: unknown }).fields,
            } as Prisma.InputJsonValue;
          }

          await db.nodeRun.update({
            where: { id: nodeRunId },
            data: {
              status: result.error ? "FAILED" : "SUCCESS",
              output: (result.output ?? undefined) as Prisma.InputJsonValue | undefined,
              error: result.error,
              inputs,
              finishedAt: new Date(),
              durationMs: result.durationMs,
            },
          });

          if (result.error) {
            hasFailure = true;
          } else {
            successCount++;
          }
        },
      }, initialOutputs);

      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - run.startedAt.getTime();

      let runStatus: "SUCCESS" | "FAILED" | "PARTIAL" = "SUCCESS";
      if (hasFailure && successCount > 0) runStatus = "PARTIAL";
      else if (hasFailure) runStatus = "FAILED";

      await db.workflowRun.update({
        where: { id: run.id },
        data: {
          status: runStatus,
          finishedAt,
          durationMs,
        },
      });
    } catch {
      const finishedAt = new Date();
      await db.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt,
          durationMs: finishedAt.getTime() - run.startedAt.getTime(),
        },
      });
    }

    const updatedRun = await db.workflowRun.findUnique({
      where: { id: run.id },
      include: { nodeRuns: true },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error("Execute error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 },
    );
  }
}
