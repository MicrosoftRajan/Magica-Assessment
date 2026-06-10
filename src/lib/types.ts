import type { Edge, Node } from "@xyflow/react";

export type DataType = "text" | "image" | "any";

export type InputFieldType =
  | "text_field"
  | "number_field"
  | "boolean_field"
  | "image_field"
  | "audio_field"
  | "video_field"
  | "media_field"
  | "file_field";

export interface InputField {
  id: string;
  name: string;
  type: InputFieldType;
  value?: string;
  imageUrl?: string;
}

export interface RequestInputsData {
  fields: InputField[];
}

export interface CropImageData {
  x: number;
  y: number;
  width: number;
  height: number;
  inputImage?: string;
  outputImage?: string;
}


export interface GeminiData {
  model: string;
  prompt?: string;
  systemPrompt?: string;
  response?: string;
  settings?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export interface ImageGenData {
  mode?: "text" | "image";
  prompt?: string;
  inputImage?: string;
  outputImages?: string[];
}

export interface VideoGenData {
  mode?: "text" | "image";
  prompt?: string;
  firstFrameImage?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  outputVideo?: string;
}

export interface ResponseData {
  result?: string | string[];
  sourceNodeId?: string;
}

export type WorkflowNodeData =
  | RequestInputsData
  | CropImageData
  | GeminiData
  | ImageGenData
  | VideoGenData
  | ResponseData;

export type WorkflowNode = Node<Record<string, unknown>>;
export type WorkflowEdge = Edge;

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface NodeRunResult {
  nodeId: string;
  status: "success" | "failed" | "running" | "pending";
  output?: unknown;
  error?: string;
  durationMs?: number;
}

export const HANDLE_TYPES: Record<string, DataType> = {
  text: "text",
  image: "image",
  any: "any",
};

export const NODE_TYPES = {
  REQUEST_INPUTS: "request-inputs",
  CROP_IMAGE: "crop-image",
  GEMINI: "gemini",
  IMAGE_GEN: "image-gen",
  VIDEO_GEN: "video-gen",
  RESPONSE: "response",
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];
