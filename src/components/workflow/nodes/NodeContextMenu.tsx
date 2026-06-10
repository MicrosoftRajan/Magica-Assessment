"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Trash2, Play } from "lucide-react";

interface NodeContextMenuProps {
  nodeId: string;
  canDelete?: boolean;
  canRun?: boolean;
  onDelete: (nodeId: string) => void;
  onRun?: (nodeId: string) => void;
}

export function NodeContextMenu({
  nodeId,
  canDelete = true,
  canRun = false,
  onDelete,
  onRun,
}: NodeContextMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1 rounded hover:bg-[#f4f4f5] transition-colors nodrag nopan"
      >
        <MoreHorizontal className="w-4 h-4 text-[#71717a]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#e4e4e7] rounded-lg shadow-lg py-1 min-w-[130px] nodrag nopan">
          {canRun && onRun && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRun(nodeId);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#18181b] hover:bg-[#f4f4f5]"
            >
              <Play className="w-3.5 h-3.5 text-green-600" />
              Run node
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(nodeId);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
