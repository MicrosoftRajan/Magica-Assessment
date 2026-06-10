"use client";

import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";

interface CanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAddNode: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddNode,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-full border border-[#ececf0] shadow-[0_4px_24px_rgba(0,0,0,0.08)] px-2 py-1.5">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 rounded-xl hover:bg-[#f4f4f6] disabled:opacity-30 transition-colors"
        title="Undo"
      >
        <Undo2 className="w-4 h-4 text-[#6b6b76]" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 rounded-xl hover:bg-[#f4f4f6] disabled:opacity-30 transition-colors"
        title="Redo"
      >
        <Redo2 className="w-4 h-4 text-[#6b6b76]" />
      </button>

      <div className="w-px h-6 bg-[#e8e8ec] mx-1" />

      <button
        onClick={onZoomOut}
        className="p-2 rounded-xl hover:bg-[#f4f4f6] transition-colors"
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4 text-[#6b6b76]" />
      </button>
      <span className="text-[11px] font-semibold text-[#6b6b76] min-w-[42px] text-center tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="p-2 rounded-xl hover:bg-[#f4f4f6] transition-colors"
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4 text-[#6b6b76]" />
      </button>
      <button
        onClick={onFitView}
        className="p-2 rounded-xl hover:bg-[#f4f4f6] transition-colors"
        title="Fit view"
      >
        <Maximize2 className="w-4 h-4 text-[#6b6b76]" />
      </button>

      <div className="w-px h-6 bg-[#e8e8ec] mx-1" />

      <button
        onClick={onAddNode}
        className="flex items-center justify-center w-9 h-9 bg-[#7c3aed] text-white rounded-full hover:bg-[#6d28d9] shadow-sm transition-colors"
        title="Add node"
      >
        <Plus className="w-5 h-5" />
      </button>

      <button
        onClick={onDelete}
        className="p-2 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
        title="Delete selected"
      >
        <Trash2 className="w-4 h-4 text-[#6b6b76]" />
      </button>
    </div>
  );
}
