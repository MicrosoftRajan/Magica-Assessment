import type { WorkflowGraph } from "./types";
import { NODE_TYPES } from "./types";

export const SAMPLE_WORKFLOW_NAME = "Trial Task Workflow";

export function createSampleWorkflowGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "request-inputs",
        type: NODE_TYPES.REQUEST_INPUTS,
        position: { x: 80, y: 200 },
        deletable: false,
        data: {
          fields: [
            {
              id: "text_field",
              name: "text_field",
              type: "text_field",
              value:
                "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
            },
            {
              id: "image_field",
              name: "image_field",
              type: "image_field",
              imageUrl: "",
            },
          ],
        },
      },
      {
        id: "crop-1",
        type: NODE_TYPES.CROP_IMAGE,
        position: { x: 480, y: 120 },
        data: { x: 20, y: 20, width: 60, height: 60 },
      },
      {
        id: "crop-2",
        type: NODE_TYPES.CROP_IMAGE,
        position: { x: 480, y: 380 },
        data: { x: 0, y: 0, width: 100, height: 50 },
      },
      {
        id: "gemini-1",
        type: NODE_TYPES.GEMINI,
        position: { x: 480, y: -40 },
        data: {
          model: "gemini-2.5-flash",
          systemPrompt:
            "You are a marketing copywriter. Write a one-paragraph product description.",
        },
      },
      {
        id: "gemini-2",
        type: NODE_TYPES.GEMINI,
        position: { x: 900, y: 40 },
        data: {
          model: "gemini-2.5-flash",
          systemPrompt:
            "Condense the following product description into a tweet-length hook (under 240 characters).",
        },
      },
      {
        id: "gemini-3",
        type: NODE_TYPES.GEMINI,
        position: { x: 1320, y: 200 },
        data: {
          model: "gemini-2.5-flash",
          systemPrompt:
            "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post.",
        },
      },
      {
        id: "response",
        type: NODE_TYPES.RESPONSE,
        position: { x: 1740, y: 220 },
        deletable: false,
        data: {},
      },
    ],
    edges: [
      {
        id: "e-text-gemini1",
        source: "request-inputs",
        sourceHandle: "text_field",
        target: "gemini-1",
        targetHandle: "prompt",
        type: "animated",
      },
      {
        id: "e-image-crop1",
        source: "request-inputs",
        sourceHandle: "image_field",
        target: "crop-1",
        targetHandle: "inputImage",
        type: "animated",
      },
      {
        id: "e-image-crop2",
        source: "request-inputs",
        sourceHandle: "image_field",
        target: "crop-2",
        targetHandle: "inputImage",
        type: "animated",
      },
      {
        id: "e-g1-g2",
        source: "gemini-1",
        sourceHandle: "response",
        target: "gemini-2",
        targetHandle: "prompt",
        type: "animated",
      },
      {
        id: "e-g2-g3",
        source: "gemini-2",
        sourceHandle: "response",
        target: "gemini-3",
        targetHandle: "prompt",
        type: "animated",
      },
      {
        id: "e-crop1-g3",
        source: "crop-1",
        sourceHandle: "outputImage",
        target: "gemini-3",
        targetHandle: "image",
        type: "animated",
      },
      {
        id: "e-crop2-g3",
        source: "crop-2",
        sourceHandle: "outputImage",
        target: "gemini-3",
        targetHandle: "image",
        type: "animated",
      },
      {
        id: "e-g3-response",
        source: "gemini-3",
        sourceHandle: "response",
        target: "response",
        targetHandle: "result",
        type: "animated",
      },
    ],
    viewport: { x: 0, y: 0, zoom: 0.48 },
  };
}

export function createEmptyWorkflowGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "request-inputs",
        type: NODE_TYPES.REQUEST_INPUTS,
        position: { x: 100, y: 200 },
        deletable: false,
        data: { fields: [] },
      },
      {
        id: "response",
        type: NODE_TYPES.RESPONSE,
        position: { x: 700, y: 200 },
        deletable: false,
        data: {},
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
