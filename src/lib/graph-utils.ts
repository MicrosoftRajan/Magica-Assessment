import type { Edge, Node } from "@xyflow/react";
import { NODE_TYPES, type DataType, type InputField } from "./types";

const HANDLE_DATA_TYPES: Record<string, DataType> = {
  text_field: "text",
  prompt: "text",
  response: "text",
  // Response node accepts any output (text, image or video)
  result: "any",
  systemPrompt: "text",
  image_field: "image",
  inputImage: "image",
  outputImage: "image",
  image: "image",
  generatedImage: "image",
  firstFrameImage: "image",
  video: "any",
};

export function getHandleDataType(handleId?: string | null): DataType {
  if (!handleId) return "any";
  if (HANDLE_DATA_TYPES[handleId]) return HANDLE_DATA_TYPES[handleId];
  // Dynamic field handles like "text_field_1718045000000"
  if (
    handleId.startsWith("text_field") ||
    handleId.startsWith("number_field") ||
    handleId.startsWith("boolean_field")
  ) {
    return "text";
  }
  if (handleId.startsWith("image_field")) return "image";
  return "any";
}

const TARGET_HANDLES_BY_NODE_TYPE: Record<string, string[]> = {
  [NODE_TYPES.GEMINI]: ["prompt", "systemPrompt", "image"],
  [NODE_TYPES.CROP_IMAGE]: ["inputImage"],
  [NODE_TYPES.IMAGE_GEN]: ["prompt", "inputImage"],
  [NODE_TYPES.VIDEO_GEN]: ["prompt", "firstFrameImage"],
  [NODE_TYPES.RESPONSE]: ["result"],
};

function getSourceHandles(node: Node): string[] {
  switch (node.type) {
    case NODE_TYPES.REQUEST_INPUTS:
      return ((node.data?.fields as InputField[] | undefined) ?? []).map(
        (f) => f.id,
      );
    case NODE_TYPES.GEMINI:
      return ["response"];
    case NODE_TYPES.CROP_IMAGE:
      return ["outputImage"];
    case NODE_TYPES.IMAGE_GEN:
      return ["generatedImage"];
    case NODE_TYPES.VIDEO_GEN:
      return ["video"];
    default:
      return [];
  }
}

function typesCompatible(a: DataType, b: DataType): boolean {
  return a === "any" || b === "any" || a === b;
}

/**
 * Picks the best target handle on a node for a wire dragged from the given
 * source handle. Prefers handles that don't already have a connection.
 */
export function findCompatibleTargetHandle(
  node: Node,
  sourceHandleId: string | null | undefined,
  edges: Edge[],
): string | null {
  const sourceType = getHandleDataType(sourceHandleId);
  const candidates = (TARGET_HANDLES_BY_NODE_TYPE[node.type ?? ""] ?? []).filter(
    (h) => typesCompatible(sourceType, getHandleDataType(h)),
  );
  if (candidates.length === 0) return null;

  const free = candidates.find(
    (h) => !edges.some((e) => e.target === node.id && e.targetHandle === h),
  );
  return free ?? candidates[0];
}

/**
 * Picks a source handle on a node compatible with the given target handle.
 */
export function findCompatibleSourceHandle(
  node: Node,
  targetHandleId: string | null | undefined,
): string | null {
  const targetType = getHandleDataType(targetHandleId);
  const candidates = getSourceHandles(node).filter((h) =>
    typesCompatible(getHandleDataType(h), targetType),
  );
  return candidates[0] ?? null;
}

export function isValidConnection(
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
): boolean {
  const sourceType = getHandleDataType(sourceHandle);
  const targetType = getHandleDataType(targetHandle);

  if (sourceType === "any" || targetType === "any") return true;
  return sourceType === targetType;
}

export function wouldCreateCycle(
  nodes: Node[],
  edges: Edge[],
  newEdge: { source: string; target: string },
): boolean {
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  adjacency.get(newEdge.source)?.push(newEdge.target);

  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (stack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    stack.add(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (dfs(neighbor)) return true;
    }

    stack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (dfs(node.id)) return true;
  }

  return false;
}

export function getTopologicalLayers(
  nodeIds: string[],
  edges: Edge[],
): string[][] {
  const nodeSet = new Set(nodeIds);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeSet.has(edge.source) || !nodeSet.has(edge.target)) continue;
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const layers: string[][] = [];
  let queue = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);

  while (queue.length > 0) {
    layers.push([...queue]);
    const nextQueue: string[] = [];

    for (const nodeId of queue) {
      for (const neighbor of adjacency.get(nodeId) ?? []) {
        const deg = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) nextQueue.push(neighbor);
      }
    }

    queue = nextQueue;
  }

  return layers;
}

export function getUpstreamNodeIds(
  targetIds: string[],
  edges: Edge[],
): Set<string> {
  const upstream = new Set<string>(targetIds);
  let changed = true;

  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (upstream.has(edge.target) && !upstream.has(edge.source)) {
        upstream.add(edge.source);
        changed = true;
      }
    }
  }

  return upstream;
}
