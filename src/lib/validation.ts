import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  graph: z
    .object({
      nodes: z.array(z.record(z.string(), z.unknown())),
      edges: z.array(z.record(z.string(), z.unknown())),
      viewport: z
        .object({
          x: z.number(),
          y: z.number(),
          zoom: z.number(),
        })
        .optional(),
    })
    .optional(),
  isSample: z.boolean().optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  graph: z
    .object({
      nodes: z.array(z.record(z.string(), z.unknown())),
      edges: z.array(z.record(z.string(), z.unknown())),
      viewport: z
        .object({
          x: z.number(),
          y: z.number(),
          zoom: z.number(),
        })
        .optional(),
    })
    .optional(),
});

export const executeWorkflowSchema = z.object({
  nodeIds: z.array(z.string()).optional(),
  scope: z.enum(["full", "partial", "single"]).default("full"),
});
