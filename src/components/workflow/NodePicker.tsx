"use client";

import { useState } from "react";
import { Search, Crop, Sparkles, ImageIcon, Clapperboard, X } from "lucide-react";

interface NodePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
}

const CATEGORIES = [
  {
    name: "Recent",
    nodes: [
      { type: "gemini", label: "Gemini", icon: Sparkles, color: "#a855f7" },
      { type: "image-gen", label: "Gemini Image 2", icon: ImageIcon, color: "#10b981" },
      { type: "video-gen", label: "Veo Video", icon: Clapperboard, color: "#ec4899" },
    ],
  },
  {
    name: "Image",
    nodes: [
      { type: "crop-image", label: "Crop Image", icon: Crop, color: "#3b82f6" },
      { type: "image-gen", label: "Gemini Image 2", icon: ImageIcon, color: "#10b981" },
    ],
  },
  {
    name: "Video",
    nodes: [
      { type: "video-gen", label: "Veo Video", icon: Clapperboard, color: "#ec4899" },
    ],
  },
  {
    name: "Others",
    nodes: [
      { type: "gemini", label: "Gemini", icon: Sparkles, color: "#a855f7" },
    ],
  },
];

export function NodePicker({ open, onClose, onSelect }: NodePickerProps) {
  const [search, setSearch] = useState("");

  if (!open) return null;

  const filtered = CATEGORIES.map((cat) => ({
    ...cat,
    nodes: cat.nodes.filter((n) =>
      n.label.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.nodes.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-24">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-[#e4e4e7] w-[360px] max-h-[400px] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e4e4e7]">
          <Search className="w-4 h-4 text-[#71717a]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 text-sm outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-[#f4f4f5]">
            <X className="w-4 h-4 text-[#71717a]" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[320px] p-2">
          {filtered.map((category) => (
            <div key={category.name} className="mb-3">
              <div className="px-2 py-1.5 text-[10px] font-medium text-[#71717a] uppercase tracking-wider">
                {category.name}
              </div>
              {category.nodes.map((node) => (
                <button
                  key={`${category.name}-${node.type}`}
                  onClick={() => {
                    onSelect(node.type);
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-[#f4f4f5] transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${node.color}15` }}
                  >
                    <node.icon className="w-4 h-4" style={{ color: node.color }} />
                  </div>
                  <span className="text-sm font-medium text-[#18181b]">
                    {node.label}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
