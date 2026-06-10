import type { Edge, Node } from "@xyflow/react";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { cropImageTask } from "@/trigger/crop-image";
import type { geminiTask } from "@/trigger/gemini";
import type { imageGenTask } from "@/trigger/image-gen";
import type { videoGenTask } from "@/trigger/video-gen";
import { getTopologicalLayers } from "@/lib/graph-utils";
import { NODE_TYPES } from "@/lib/types";
import type {
  CropImageData,
  GeminiData,
  ImageGenData,
  InputField,
  RequestInputsData,
  VideoGenData,
} from "@/lib/types";

export type NodeOutputMap = Map<string, Record<string, unknown>>;

export interface ExecutionCallbacks {
  onNodeStart: (nodeId: string) => Promise<void>;
  onNodeComplete: (
    nodeId: string,
    result: { output?: unknown; error?: string; durationMs: number },
  ) => Promise<void>;
}

function getFieldValue(field: InputField): string {
  // URL-based fields store their value in imageUrl; the rest use value
  if (
    field.type === "image_field" ||
    field.type === "audio_field" ||
    field.type === "video_field" ||
    field.type === "media_field" ||
    field.type === "file_field"
  ) {
    return field.imageUrl ?? field.value ?? "";
  }
  return field.value ?? "";
}

function getOutputFromNodeData(
  node: Node,
  handleId: string,
): unknown {
  const data = node.data as Record<string, unknown>;

  if (node.type === NODE_TYPES.REQUEST_INPUTS) {
    const fields = (data as unknown as RequestInputsData).fields ?? [];
    const field = fields.find((f) => f.id === handleId);
    if (field) return getFieldValue(field);
  }

  if (node.type === NODE_TYPES.GEMINI && handleId === "response") {
    return (data as unknown as GeminiData).response;
  }

  if (node.type === NODE_TYPES.CROP_IMAGE && handleId === "outputImage") {
    return (data as unknown as CropImageData).outputImage;
  }

  if (node.type === NODE_TYPES.IMAGE_GEN && handleId === "generatedImage") {
    return (data as unknown as ImageGenData).outputImages?.[0];
  }

  if (node.type === NODE_TYPES.VIDEO_GEN && handleId === "video") {
    return (data as unknown as VideoGenData).outputVideo;
  }

  if (handleId === "prompt") return data.prompt;
  if (handleId === "systemPrompt") return data.systemPrompt;
  if (handleId === "inputImage") return data.inputImage;
  if (handleId === "result") return data.result;

  return data[handleId];
}

function resolveInput(
  node: Node,
  handleId: string,
  edges: Edge[],
  outputs: NodeOutputMap,
  nodeMap: Map<string, Node>,
): unknown {
  const incoming = edges.find(
    (e) => e.target === node.id && e.targetHandle === handleId,
  );

  if (incoming) {
    const sourceHandle = incoming.sourceHandle ?? "response";
    const sourceOutputs = outputs.get(incoming.source);
    const fromOutput = sourceOutputs?.[sourceHandle];
    if (fromOutput !== undefined && fromOutput !== null && fromOutput !== "") {
      return fromOutput;
    }

    const sourceNode = nodeMap.get(incoming.source);
    if (sourceNode) {
      return getOutputFromNodeData(sourceNode, sourceHandle);
    }
  }

  const data = node.data as Record<string, unknown>;
  if (handleId === "prompt") return data.prompt;
  if (handleId === "systemPrompt") return data.systemPrompt;
  if (handleId === "inputImage") return data.inputImage;
  if (handleId === "result") return data.result;

  return data[handleId];
}

function resolveImageInputs(
  nodeId: string,
  edges: Edge[],
  outputs: NodeOutputMap,
  nodeMap: Map<string, Node>,
): string[] {
  return edges
    .filter((e) => e.target === nodeId && e.targetHandle === "image")
    .map((e) => {
      const handle = e.sourceHandle ?? "outputImage";
      const sourceOutputs = outputs.get(e.source);
      const fromOutput = sourceOutputs?.[handle] as string | undefined;
      if (fromOutput) return fromOutput;

      const sourceNode = nodeMap.get(e.source);
      if (sourceNode) {
        return getOutputFromNodeData(sourceNode, handle) as string;
      }
      return undefined;
    })
    .filter((url): url is string => Boolean(url));
}

export function seedOutputsFromGraph(
  nodes: Node[],
  targetNodeIds: string[],
): NodeOutputMap {
  const outputs: NodeOutputMap = new Map();
  const targetSet = new Set(targetNodeIds);

  for (const node of nodes) {
    if (targetSet.has(node.id)) continue;

    if (node.type === NODE_TYPES.REQUEST_INPUTS) {
      const data = node.data as unknown as RequestInputsData;
      const result: Record<string, unknown> = {};
      for (const field of data.fields ?? []) {
        result[field.id] = getFieldValue(field);
      }
      outputs.set(node.id, result);
    } else if (node.type === NODE_TYPES.GEMINI) {
      const response = (node.data as unknown as GeminiData).response;
      if (response) outputs.set(node.id, { response });
    } else if (node.type === NODE_TYPES.CROP_IMAGE) {
      const outputImage = (node.data as unknown as CropImageData).outputImage;
      if (outputImage) outputs.set(node.id, { outputImage });
    } else if (node.type === NODE_TYPES.IMAGE_GEN) {
      const images = (node.data as unknown as ImageGenData).outputImages;
      if (images?.length) {
        outputs.set(node.id, { images, generatedImage: images[0] });
      }
    } else if (node.type === NODE_TYPES.VIDEO_GEN) {
      const video = (node.data as unknown as VideoGenData).outputVideo;
      if (video) outputs.set(node.id, { video });
    }
  }

  return outputs;
}

async function executeRequestInputs(
  node: Node,
): Promise<Record<string, unknown>> {
  const data = node.data as unknown as RequestInputsData;
  const result: Record<string, unknown> = {};

  for (const field of data.fields ?? []) {
    result[field.id] = getFieldValue(field);
  }

  return result;
}

async function executeResponse(
  node: Node,
  edges: Edge[],
  outputs: NodeOutputMap,
  nodeMap: Map<string, Node>,
): Promise<Record<string, unknown>> {
  // Aggregate every incoming connection, not just the first one
  const incomingEdges = edges.filter((e) => e.target === node.id);
  const values: unknown[] = [];

  for (const incoming of incomingEdges) {
    const handle = incoming.sourceHandle ?? "response";
    const sourceNode = nodeMap.get(incoming.source);
    const sourceOutputs = outputs.get(incoming.source);
    const value =
      sourceOutputs?.[handle] ??
      (sourceNode ? getOutputFromNodeData(sourceNode, handle) : undefined);
    if (value !== undefined && value !== null && value !== "") {
      values.push(value);
    }
  }

  if (values.length === 0) return { result: "" };
  return { result: values.length === 1 ? values[0] : values };
}

async function executeCropImage(
  node: Node,
  edges: Edge[],
  outputs: NodeOutputMap,
  nodeMap: Map<string, Node>,
): Promise<Record<string, unknown>> {
  const data = node.data as unknown as CropImageData;
  const imageUrl = resolveInput(
    node,
    "inputImage",
    edges,
    outputs,
    nodeMap,
  ) as string;

  if (!imageUrl) {
    throw new Error("Input image is required");
  }

  const handle = await tasks.trigger<typeof cropImageTask>("crop-image", {
    imageUrl,
    x: data.x ?? 0,
    y: data.y ?? 0,
    width: data.width ?? 100,
    height: data.height ?? 100,
  });

  const run = await runs.poll(handle, { pollIntervalMs: 2000 });

  if (run.status !== "COMPLETED" || !run.output) {
    throw new Error(run.error?.message ?? `Crop image task ${run.status}`);
  }

  return { outputImage: run.output.outputUrl };
}

async function executeGemini(
  node: Node,
  edges: Edge[],
  outputs: NodeOutputMap,
  nodeMap: Map<string, Node>,
): Promise<Record<string, unknown>> {
  const data = node.data as unknown as GeminiData;
  const prompt = resolveInput(node, "prompt", edges, outputs, nodeMap) as string;
  const systemPrompt = (resolveInput(
    node,
    "systemPrompt",
    edges,
    outputs,
    nodeMap,
  ) ?? data.systemPrompt) as string | undefined;

  if (!prompt) {
    throw new Error("Prompt is required");
  }

  const imageUrls = resolveImageInputs(node.id, edges, outputs, nodeMap);

  const handle = await tasks.trigger<typeof geminiTask>("gemini-generate", {
    model: data.model || "gemini-2.5-flash",
    prompt,
    systemPrompt,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    temperature: data.settings?.temperature,
    maxTokens: data.settings?.maxTokens,
  });

  const run = await runs.poll(handle, { pollIntervalMs: 1000 });

  if (run.status !== "COMPLETED" || !run.output) {
    throw new Error(run.error?.message ?? `Gemini task ${run.status}`);
  }

  return { response: run.output.response };
}

async function executeImageGen(
  node: Node,
  edges: Edge[],
  outputs: NodeOutputMap,
  nodeMap: Map<string, Node>,
): Promise<Record<string, unknown>> {
  const data = node.data as unknown as ImageGenData;
  const prompt = resolveInput(node, "prompt", edges, outputs, nodeMap) as string;
  if (!prompt) throw new Error("Prompt is required");

  const inputImage =
    data.mode === "image"
      ? (resolveInput(node, "inputImage", edges, outputs, nodeMap) as
          | string
          | undefined)
      : undefined;

  const handle = await tasks.trigger<typeof imageGenTask>("image-generate", {
    prompt,
    inputImage: inputImage || undefined,
  });

  const run = await runs.poll(handle, { pollIntervalMs: 2000 });

  if (run.status !== "COMPLETED" || !run.output) {
    throw new Error(run.error?.message ?? `Image generation ${run.status}`);
  }

  return {
    images: run.output.images,
    generatedImage: run.output.images[0],
  };
}

async function executeVideoGen(
  node: Node,
  edges: Edge[],
  outputs: NodeOutputMap,
  nodeMap: Map<string, Node>,
): Promise<Record<string, unknown>> {
  const data = node.data as unknown as VideoGenData;
  const prompt = resolveInput(node, "prompt", edges, outputs, nodeMap) as string;
  if (!prompt) throw new Error("Prompt is required");

  const firstFrameImage =
    data.mode !== "text"
      ? (resolveInput(node, "firstFrameImage", edges, outputs, nodeMap) as
          | string
          | undefined)
      : undefined;

  const handle = await tasks.trigger<typeof videoGenTask>("video-generate", {
    prompt,
    firstFrameImage: firstFrameImage || undefined,
    durationSeconds: data.duration ?? 5,
    aspectRatio: data.aspectRatio ?? "16:9",
    generateAudio: data.generateAudio ?? true,
  });

  const run = await runs.poll(handle, { pollIntervalMs: 3000 });

  if (run.status !== "COMPLETED" || !run.output) {
    throw new Error(run.error?.message ?? `Video generation ${run.status}`);
  }

  return { video: run.output.video };
}

async function executeNode(
  node: Node,
  edges: Edge[],
  outputs: NodeOutputMap,
  nodeMap: Map<string, Node>,
): Promise<Record<string, unknown>> {
  switch (node.type) {
    case NODE_TYPES.REQUEST_INPUTS:
      return executeRequestInputs(node);
    case NODE_TYPES.RESPONSE:
      return executeResponse(node, edges, outputs, nodeMap);
    case NODE_TYPES.CROP_IMAGE:
      return executeCropImage(node, edges, outputs, nodeMap);
    case NODE_TYPES.GEMINI:
      return executeGemini(node, edges, outputs, nodeMap);
    case NODE_TYPES.IMAGE_GEN:
      return executeImageGen(node, edges, outputs, nodeMap);
    case NODE_TYPES.VIDEO_GEN:
      return executeVideoGen(node, edges, outputs, nodeMap);
    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

export async function executeWorkflowGraph(
  nodes: Node[],
  edges: Edge[],
  targetNodeIds: string[],
  callbacks: ExecutionCallbacks,
  initialOutputs?: NodeOutputMap,
): Promise<NodeOutputMap> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const layers = getTopologicalLayers(targetNodeIds, edges);
  const outputs: NodeOutputMap = new Map(initialOutputs);

  for (const layer of layers) {
    await Promise.all(
      layer.map(async (nodeId) => {
        const node = nodeMap.get(nodeId);
        if (!node) return;

        const startTime = Date.now();
        await callbacks.onNodeStart(nodeId);

        try {
          const result = await executeNode(node, edges, outputs, nodeMap);
          outputs.set(nodeId, result);
          await callbacks.onNodeComplete(nodeId, {
            output: result,
            durationMs: Date.now() - startTime,
          });
        } catch (error) {
          await callbacks.onNodeComplete(nodeId, {
            error: error instanceof Error ? error.message : "Unknown error",
            durationMs: Date.now() - startTime,
          });
          throw error;
        }
      }),
    );
  }

  return outputs;
}

export function getNodeLabel(node: Node): string {
  switch (node.type) {
    case NODE_TYPES.REQUEST_INPUTS:
      return "Request Inputs";
    case NODE_TYPES.RESPONSE:
      return "Response";
    case NODE_TYPES.CROP_IMAGE:
      return "Crop Image";
    case NODE_TYPES.GEMINI:
      return "Gemini";
    case NODE_TYPES.IMAGE_GEN:
      return "Gemini Image 2";
    case NODE_TYPES.VIDEO_GEN:
      return "Veo Video";
    default:
      return node.type ?? "Node";
  }
}
