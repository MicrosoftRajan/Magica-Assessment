"use client";

import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { GripVertical, ImageIcon, Loader2, Play } from "lucide-react";
import Image from "next/image";
import { NodeHandle } from "./NodeHandle";
import { NodeContextMenu } from "./NodeContextMenu";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { ImageGenData } from "@/lib/types";

function ImageGenNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const runNode = useWorkflowStore((s) => s.runNode);
  const runningNodeIds = useWorkflowStore((s) => s.runningNodeIds);
  const edges = useWorkflowStore((s) => s.edges);
  const nodeData = data as unknown as ImageGenData;
  const isRunning = runningNodeIds.has(id);
  const mode = nodeData.mode ?? "text";

  const isPromptConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "prompt",
  );
  const isImageConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "inputImage",
  );

  return (
    <div
      className={`galaxy-node bg-white rounded-xl border min-w-[300px] max-w-[360px] ${
        selected ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/15" : "border-[#e8e8ec]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f2] bg-[#fafafa] rounded-t-xl">
        <GripVertical className="w-3.5 h-3.5 text-[#c4c4c8] cursor-grab" />
        <ImageIcon className="w-4 h-4 text-[#10b981]" />
        <span className="text-[13px] font-semibold text-[#1a1a1e] flex-1">
          Gemini Image 2
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            runNode(id, "single");
          }}
          disabled={isRunning}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md hover:bg-emerald-100 transition-colors nodrag nopan disabled:opacity-50"
        >
          {isRunning ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          Run
        </button>
        <NodeContextMenu
          nodeId={id}
          canRun
          onRun={(nid) => runNode(nid, "single")}
          onDelete={deleteNode}
        />
      </div>

      <div className="p-3.5 space-y-3">
        {/* Mode tabs */}
        <div className="flex bg-[#f4f4f5] rounded-lg p-0.5">
          {(
            [
              { key: "text", label: "Text to Image" },
              { key: "image", label: "Image to Image" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => updateNodeData(id, { mode: tab.key })}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors nodrag nopan ${
                mode === tab.key
                  ? "bg-[#18181b] text-white shadow-sm"
                  : "text-[#71717a] hover:text-[#3f3f46]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#6b6b76]">
              Prompt <span className="text-red-400">*</span>
            </span>
            <NodeHandle id="prompt" type="target" position={Position.Left} />
          </div>
          <textarea
            value={nodeData.prompt ?? ""}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            disabled={isPromptConnected}
            rows={2}
            placeholder="Describe the image you want to create..."
            className="galaxy-input w-full px-2.5 py-2 text-[12px] border border-[#e8e8ec] rounded-lg resize-none focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/20 disabled:bg-[#f4f4f6] disabled:text-[#a0a0a8] nodrag"
          />
        </div>

        {mode === "image" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#6b6b76]">
                Input Image
              </span>
              <NodeHandle
                id="inputImage"
                type="target"
                position={Position.Left}
              />
            </div>
            {isImageConnected ? (
              <div className="text-[11px] text-[#8b5cf6] bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                Image connected via wire
              </div>
            ) : (
              <input
                type="url"
                value={nodeData.inputImage ?? ""}
                onChange={(e) =>
                  updateNodeData(id, { inputImage: e.target.value })
                }
                placeholder="Paste image URL or connect a wire..."
                className="galaxy-input w-full px-2.5 py-1.5 text-[11px] border border-[#e8e8ec] rounded-lg focus:outline-none focus:border-[#8b5cf6] nodrag"
              />
            )}
          </div>
        )}

        <div className="p-2.5 bg-[#f8f8fa] rounded-lg border border-[#f0f0f2]">
          <div className="text-[10px] font-semibold text-[#6b6b76] uppercase tracking-wide mb-1">
            Generated Images
          </div>
          {nodeData.outputImages?.length ? (
            <div className="space-y-2">
              {nodeData.outputImages.map((img, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden border border-[#e8e8ec] bg-white flex items-center justify-center"
                >
                  <Image
                    src={img}
                    alt={`Generated ${i + 1}`}
                    width={320}
                    height={320}
                    className="w-full h-auto max-h-48 object-contain"
                    loading="eager"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#a1a1aa] italic text-center py-3">
              No output yet
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-[#6b6b76]">Image</span>
          <NodeHandle
            id="generatedImage"
            type="source"
            position={Position.Right}
          />
        </div>
      </div>
    </div>
  );
}

export const ImageGenNode = memo(ImageGenNodeComponent);
