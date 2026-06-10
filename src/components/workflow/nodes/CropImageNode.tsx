"use client";

import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { GripVertical, Crop, Loader2, Play } from "lucide-react";
import { NodeHandle } from "./NodeHandle";
import { NodeContextMenu } from "./NodeContextMenu";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { CropImageData } from "@/lib/types";
import Image from "next/image";

function CropImageNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const runNode = useWorkflowStore((s) => s.runNode);
  const runningNodeIds = useWorkflowStore((s) => s.runningNodeIds);
  const nodeData = data as unknown as CropImageData;
  const edges = useWorkflowStore((s) => s.edges);
  const isInputConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "inputImage",
  );
  const isRunning = runningNodeIds.has(id);

  const update = (key: keyof CropImageData, value: number | string) => {
    updateNodeData(id, { [key]: value });
  };

  const fields = [
    { key: "x" as const, label: "X Position (%)", value: nodeData.x ?? 0 },
    { key: "y" as const, label: "Y Position (%)", value: nodeData.y ?? 0 },
    { key: "width" as const, label: "Width (%)", value: nodeData.width ?? 100 },
    { key: "height" as const, label: "Height (%)", value: nodeData.height ?? 100 },
  ];

  return (
    <div
      className={`galaxy-node bg-white rounded-xl border min-w-[260px] ${
        selected ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/15" : "border-[#e8e8ec]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f2] bg-[#fafafa] rounded-t-xl">
        <GripVertical className="w-3.5 h-3.5 text-[#c4c4c8] cursor-grab" />
        <Crop className="w-4 h-4 text-[#3b82f6]" />
        <span className="text-[13px] font-semibold text-[#1a1a1e] flex-1">Crop Image</span>
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
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#6b6b76]">Input Image</span>
          <NodeHandle
            id="inputImage"
            type="target"
            position={Position.Left}
          />
        </div>

        {isInputConnected ? (
          <div className="text-[11px] text-[#3b82f6] bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
            Image connected via wire
          </div>
        ) : (
          <input
            type="url"
            value={nodeData.inputImage ?? ""}
            onChange={(e) => update("inputImage", e.target.value)}
            placeholder="Paste image URL or connect a wire..."
            className="galaxy-input w-full px-2.5 py-1.5 text-[11px] border border-[#e8e8ec] rounded-lg focus:outline-none focus:border-[#3b82f6] nodrag"
          />
        )}

        <div className="p-2.5 bg-[#f8f8fa] rounded-lg border border-[#f0f0f2]">
          <div className="text-[10px] font-semibold text-[#6b6b76] uppercase tracking-wide mb-1">
            Cropped Image
          </div>
          {nodeData.outputImage ? (
            <div className="rounded-lg overflow-hidden border border-[#e8e8ec] bg-white flex items-center justify-center">
              <Image
                src={nodeData.outputImage}
                alt="Cropped output"
                width={320}
                height={320}
                className="w-full h-auto max-h-48 object-contain"
                loading="eager"
                unoptimized
              />
            </div>
          ) : (
            <p className="text-[11px] text-[#a1a1aa] italic text-center py-3">
              No output yet
            </p>
          )}
        </div>

        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-[#6b6b76]">{field.label}</label>
              <input
                type="number"
                value={field.value}
                onChange={(e) => update(field.key, Number(e.target.value))}
                className="w-14 px-2 py-0.5 text-[11px] text-right border border-[#e8e8ec] rounded focus:outline-none focus:ring-1 focus:ring-[#3b82f6] nodrag"
                min={0}
                max={100}
              />
            </div>
            <input
              type="range"
              value={field.value}
              onChange={(e) => update(field.key, Number(e.target.value))}
              className="w-full h-1 accent-[#3b82f6] nodrag"
              min={0}
              max={100}
            />
          </div>
        ))}

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-[#6b6b76]">Output Image</span>
          <NodeHandle
            id="outputImage"
            type="source"
            position={Position.Right}
          />
        </div>
      </div>
    </div>
  );
}

export const CropImageNode = memo(CropImageNodeComponent);
