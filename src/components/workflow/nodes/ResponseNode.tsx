"use client";

import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { GripVertical, Send } from "lucide-react";
import Image from "next/image";
import { NodeHandle } from "./NodeHandle";
import type { ResponseData } from "@/lib/types";

function isImageValue(value: string): boolean {
  return (
    value.startsWith("data:image/") ||
    /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(value) ||
    /transloadit|tlcdn/.test(value)
  );
}

function isVideoValue(value: string): boolean {
  return (
    value.startsWith("data:video/") ||
    /\.(mp4|webm|mov)(\?.*)?$/i.test(value) ||
    /generativelanguage.*files.*download/.test(value)
  );
}

function ResponseNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ResponseData;
  const raw = nodeData.result;
  const items = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map(String)
    .filter((v) => v !== "");

  return (
    <div
      className={`galaxy-node bg-white rounded-xl border min-w-[240px] ${
        selected ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/15" : "border-[#e8e8ec]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f2] bg-[#fafafa] rounded-t-xl">
        <GripVertical className="w-3.5 h-3.5 text-[#c4c4c8] cursor-grab" />
        <Send className="w-4 h-4 text-[#22c55e]" />
        <span className="text-[13px] font-semibold text-[#1a1a1e]">Response</span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <NodeHandle id="result" type="target" position={Position.Left} />
          <span className="text-xs text-[#71717a]">result</span>
        </div>

        <div className="p-3 bg-[#f4f4f5] rounded-lg min-h-[60px] space-y-2">
          {items.length > 0 ? (
            items.map((item, i) =>
              isVideoValue(item) ? (
                <video
                  key={i}
                  src={item}
                  controls
                  className="w-full rounded-lg border border-[#e8e8ec] max-h-56 nodrag"
                />
              ) : isImageValue(item) ? (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden border border-[#e8e8ec] bg-white flex items-center justify-center"
                >
                  <Image
                    src={item}
                    alt={`Result ${i + 1}`}
                    width={320}
                    height={320}
                    className="w-full h-auto max-h-56 object-contain"
                    loading="eager"
                    unoptimized
                  />
                </div>
              ) : (
                <p key={i} className="text-xs text-[#18181b] whitespace-pre-wrap">
                  {item}
                </p>
              ),
            )
          ) : (
            <p className="text-xs text-[#a1a1aa] italic">
              Connect a node output to display the final result
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const ResponseNode = memo(ResponseNodeComponent);
