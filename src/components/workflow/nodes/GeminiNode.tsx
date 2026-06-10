"use client";

import { memo, useState } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { GripVertical, Sparkles, ChevronDown, Play, Loader2 } from "lucide-react";
import { NodeHandle } from "./NodeHandle";
import { NodeContextMenu } from "./NodeContextMenu";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { GeminiData } from "@/lib/types";

const MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
];

function GeminiNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const runNode = useWorkflowStore((s) => s.runNode);
  const runningNodeIds = useWorkflowStore((s) => s.runningNodeIds);
  const edges = useWorkflowStore((s) => s.edges);
  const nodeData = data as unknown as GeminiData;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isRunning = runningNodeIds.has(id);

  const isPromptConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "prompt",
  );
  const isSystemConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "systemPrompt",
  );
  const imageConnections = edges.filter(
    (e) => e.target === id && e.targetHandle === "image",
  ).length;

  return (
    <div
      className={`galaxy-node bg-white rounded-xl border min-w-[300px] max-w-[360px] ${
        selected ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/15" : "border-[#e8e8ec]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f2] bg-[#fafafa] rounded-t-xl">
        <GripVertical className="w-3.5 h-3.5 text-[#c4c4c8] cursor-grab" />
        <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
        <select
          value={nodeData.model ?? "gemini-2.5-flash"}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
          className="text-[13px] font-semibold text-[#1a1a1e] bg-transparent border-none outline-none cursor-pointer flex-1 nodrag"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
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
            placeholder="Enter prompt..."
            className="galaxy-input w-full px-2.5 py-2 text-[12px] border border-[#e8e8ec] rounded-lg resize-none focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 disabled:bg-[#f4f4f6] disabled:text-[#a0a0a8] nodrag"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#6b6b76]">System Prompt</span>
            <NodeHandle
              id="systemPrompt"
              type="target"
              position={Position.Left}
            />
          </div>
          <textarea
            value={nodeData.systemPrompt ?? ""}
            onChange={(e) =>
              updateNodeData(id, { systemPrompt: e.target.value })
            }
            disabled={isSystemConnected}
            rows={2}
            placeholder="System instructions..."
            className="galaxy-input w-full px-2.5 py-2 text-[12px] border border-[#e8e8ec] rounded-lg resize-none focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 disabled:bg-[#f4f4f6] disabled:text-[#a0a0a8] nodrag"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#6b6b76]">
            Image (Vision)
            {imageConnections > 0 && (
              <span className="ml-1 text-[#3b82f6]">({imageConnections})</span>
            )}
          </span>
          <NodeHandle id="image" type="target" position={Position.Left} />
        </div>

        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex items-center gap-1 text-[11px] text-[#6b6b76] hover:text-[#1a1a1e] nodrag"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
          />
          Settings
        </button>

        {settingsOpen && (
          <div className="space-y-2 pl-2 border-l-2 border-[#e8e8ec]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b76]">Temperature</span>
              <input
                type="number"
                value={nodeData.settings?.temperature ?? 0.7}
                onChange={(e) =>
                  updateNodeData(id, {
                    settings: {
                      ...nodeData.settings,
                      temperature: Number(e.target.value),
                    },
                  })
                }
                className="w-16 px-2 py-0.5 text-[11px] border border-[#e8e8ec] rounded nodrag"
                min={0}
                max={2}
                step={0.1}
              />
            </div>
          </div>
        )}

        <div className="mt-1 p-2.5 bg-[#f8f8fa] rounded-lg border border-[#f0f0f2]">
          <div className="text-[10px] font-semibold text-[#6b6b76] uppercase tracking-wide mb-1">
            Response
          </div>
          {nodeData.response ? (
            <p className="text-[12px] text-[#1a1a1e] whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto nodrag">
              {nodeData.response}
            </p>
          ) : (
            <p className="text-[11px] text-[#a1a1aa] italic text-center py-3">
              No output yet
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-[#6b6b76]">Response</span>
          <NodeHandle id="response" type="source" position={Position.Right} />
        </div>
      </div>
    </div>
  );
}

export const GeminiNode = memo(GeminiNodeComponent);
