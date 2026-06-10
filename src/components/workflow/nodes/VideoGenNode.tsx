"use client";

import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { GripVertical, Clapperboard, Loader2, Play } from "lucide-react";
import { NodeHandle } from "./NodeHandle";
import { NodeContextMenu } from "./NodeContextMenu";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { VideoGenData } from "@/lib/types";

function VideoGenNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const runNode = useWorkflowStore((s) => s.runNode);
  const runningNodeIds = useWorkflowStore((s) => s.runningNodeIds);
  const edges = useWorkflowStore((s) => s.edges);
  const nodeData = data as unknown as VideoGenData;
  const isRunning = runningNodeIds.has(id);
  const mode = nodeData.mode ?? "image";

  const isPromptConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "prompt",
  );
  const isFrameConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "firstFrameImage",
  );

  return (
    <div
      className={`galaxy-node bg-white rounded-xl border min-w-[300px] max-w-[360px] ${
        selected ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/15" : "border-[#e8e8ec]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f2] bg-[#fafafa] rounded-t-xl">
        <GripVertical className="w-3.5 h-3.5 text-[#c4c4c8] cursor-grab" />
        <Clapperboard className="w-4 h-4 text-[#ec4899]" />
        <span className="text-[13px] font-semibold text-[#1a1a1e] flex-1">
          Veo Video
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
              { key: "text", label: "Text to Video" },
              { key: "image", label: "Image to Video" },
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
            placeholder="Describe the video you want to generate..."
            className="galaxy-input w-full px-2.5 py-2 text-[12px] border border-[#e8e8ec] rounded-lg resize-none focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/20 disabled:bg-[#f4f4f6] disabled:text-[#a0a0a8] nodrag"
          />
        </div>

        {mode === "image" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#6b6b76]">
                First Frame Image
              </span>
              <NodeHandle
                id="firstFrameImage"
                type="target"
                position={Position.Left}
              />
            </div>
            {isFrameConnected ? (
              <div className="text-[11px] text-[#8b5cf6] bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                Image connected via wire
              </div>
            ) : (
              <input
                type="url"
                value={nodeData.firstFrameImage ?? ""}
                onChange={(e) =>
                  updateNodeData(id, { firstFrameImage: e.target.value })
                }
                placeholder="Paste image URL or connect a wire..."
                className="galaxy-input w-full px-2.5 py-1.5 text-[11px] border border-[#e8e8ec] rounded-lg focus:outline-none focus:border-[#8b5cf6] nodrag"
              />
            )}
          </div>
        )}

        {/* Settings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b76]">Duration</span>
            <select
              value={nodeData.duration ?? 5}
              onChange={(e) =>
                updateNodeData(id, { duration: Number(e.target.value) })
              }
              className="px-2 py-1 text-[11px] border border-[#e8e8ec] rounded-md bg-white nodrag"
            >
              {[4, 5, 6, 8].map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b76]">Aspect Ratio</span>
            <select
              value={nodeData.aspectRatio ?? "16:9"}
              onChange={(e) =>
                updateNodeData(id, { aspectRatio: e.target.value })
              }
              className="px-2 py-1 text-[11px] border border-[#e8e8ec] rounded-md bg-white nodrag"
            >
              {["16:9", "9:16", "1:1"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b76]">Resolution</span>
            <select
              value={nodeData.resolution ?? "720p"}
              onChange={(e) =>
                updateNodeData(id, { resolution: e.target.value })
              }
              className="px-2 py-1 text-[11px] border border-[#e8e8ec] rounded-md bg-white nodrag"
            >
              {["720p", "1080p"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b76]">Generate Audio</span>
            <button
              onClick={() =>
                updateNodeData(id, {
                  generateAudio: !(nodeData.generateAudio ?? true),
                })
              }
              className={`relative w-10 rounded-full transition-colors nodrag nopan ${
                (nodeData.generateAudio ?? true) ? "bg-[#8b5cf6]" : "bg-[#d4d4d8]"
              }`}
              style={{ height: 22 }}
            >
              <span
                className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${
                  (nodeData.generateAudio ?? true)
                    ? "translate-x-[21px]"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-2.5 bg-[#f8f8fa] rounded-lg border border-[#f0f0f2]">
          <div className="text-[10px] font-semibold text-[#6b6b76] uppercase tracking-wide mb-1">
            Generated Video
          </div>
          {nodeData.outputVideo ? (
            <video
              src={nodeData.outputVideo}
              controls
              className="w-full rounded-lg border border-[#e8e8ec] max-h-52 nodrag"
            />
          ) : (
            <p className="text-[11px] text-[#a1a1aa] italic text-center py-3">
              No output yet
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-[#6b6b76]">Video</span>
          <NodeHandle id="video" type="source" position={Position.Right} />
        </div>
      </div>
    </div>
  );
}

export const VideoGenNode = memo(VideoGenNodeComponent);
