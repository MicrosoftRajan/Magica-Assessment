"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import {
  Plus,
  GripVertical,
  Type,
  Hash,
  ToggleLeft,
  ImageIcon,
  Music,
  Video,
  Clapperboard,
  File,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { NodeHandle } from "./NodeHandle";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { InputField, InputFieldType, RequestInputsData } from "@/lib/types";
import { ImageUploadField } from "../ImageUploadField";

const FIELD_TYPES: {
  type: InputFieldType;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { type: "text_field", label: "Text", icon: Type, color: "#f97316" },
  { type: "number_field", label: "Number", icon: Hash, color: "#f97316" },
  { type: "boolean_field", label: "Boolean", icon: ToggleLeft, color: "#f97316" },
  { type: "image_field", label: "Image", icon: ImageIcon, color: "#3b82f6" },
  { type: "audio_field", label: "Audio", icon: Music, color: "#8b5cf6" },
  { type: "video_field", label: "Video", icon: Video, color: "#ec4899" },
  { type: "media_field", label: "Media", icon: Clapperboard, color: "#ec4899" },
  { type: "file_field", label: "File", icon: File, color: "#71717a" },
];

const URL_FIELD_TYPES: InputFieldType[] = [
  "audio_field",
  "video_field",
  "media_field",
  "file_field",
];

function getFieldMeta(type: InputFieldType) {
  return FIELD_TYPES.find((f) => f.type === type) ?? FIELD_TYPES[0];
}

function FieldTypeMenu({
  onSelect,
  onClose,
}: {
  onSelect: (type: InputFieldType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-2 top-full mt-1 z-50 bg-white border border-[#e8e8ec] rounded-xl shadow-xl py-1.5 min-w-[150px] nodrag nopan"
    >
      {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(type);
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-3.5 py-1.5 text-[12px] text-[#3f3f46] hover:bg-[#f4f4f5] transition-colors"
        >
          <Icon className="w-3.5 h-3.5 text-[#71717a]" />
          {label}
        </button>
      ))}
    </div>
  );
}

function RequestInputsNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const nodeData = data as unknown as RequestInputsData;
  const fields = nodeData.fields ?? [];
  const [menuOpen, setMenuOpen] = useState(false);

  const addField = useCallback(
    (type: InputFieldType) => {
      const fieldId = `${type}_${Date.now()}`;
      const label = getFieldMeta(type).label.toLowerCase();
      const newField: InputField = {
        id: fieldId,
        name: `${label}_input`,
        type,
        value: "",
        imageUrl: "",
      };
      updateNodeData(id, { fields: [...fields, newField] });
    },
    [id, fields, updateNodeData],
  );

  const updateField = useCallback(
    (fieldId: string, updates: Partial<InputField>) => {
      updateNodeData(id, {
        fields: fields.map((f) =>
          f.id === fieldId ? { ...f, ...updates } : f,
        ),
      });
    },
    [id, fields, updateNodeData],
  );

  const removeField = useCallback(
    (fieldId: string) => {
      updateNodeData(id, { fields: fields.filter((f) => f.id !== fieldId) });
    },
    [id, fields, updateNodeData],
  );

  return (
    <div
      className={`galaxy-node bg-white rounded-xl border min-w-[280px] relative ${
        selected ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/15" : "border-[#e8e8ec]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f2] bg-[#fafafa] rounded-t-xl">
        <GripVertical className="w-3.5 h-3.5 text-[#c4c4c8] cursor-grab" />
        <span className="text-[13px] font-semibold text-[#1a1a1e]">Request Inputs</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="ml-auto p-1 rounded-md hover:bg-[#f0f0f2] transition-colors nodrag nopan"
          title="Add field"
        >
          <Plus className="w-3.5 h-3.5 text-[#71717a]" />
        </button>
      </div>

      {menuOpen && (
        <FieldTypeMenu onSelect={addField} onClose={() => setMenuOpen(false)} />
      )}

      <div className="p-4 space-y-4">
        {fields.length === 0 && (
          <p className="text-xs text-[#71717a] text-center py-2">
            Click + to add input fields
          </p>
        )}

        {fields.map((field) => {
          const meta = getFieldMeta(field.type);
          const Icon = meta.icon;
          return (
            <div key={field.id} className="relative group">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                <input
                  value={field.name}
                  onChange={(e) =>
                    updateField(field.id, { name: e.target.value })
                  }
                  className="text-xs font-medium text-[#18181b] bg-transparent border-none outline-none flex-1 nodrag"
                />
                <button
                  onClick={() => removeField(field.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 transition-all nodrag nopan"
                  title="Remove field"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>

              {field.type === "text_field" && (
                <textarea
                  value={field.value ?? ""}
                  onChange={(e) =>
                    updateField(field.id, { value: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-[#e4e4e7] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] nodrag"
                  placeholder="Enter text..."
                />
              )}

              {field.type === "number_field" && (
                <input
                  type="number"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    updateField(field.id, { value: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#e4e4e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] nodrag"
                  placeholder="0"
                />
              )}

              {field.type === "boolean_field" && (
                <button
                  onClick={() =>
                    updateField(field.id, {
                      value: field.value === "true" ? "false" : "true",
                    })
                  }
                  className={`relative w-10 h-5.5 rounded-full transition-colors nodrag nopan ${
                    field.value === "true" ? "bg-[#8b5cf6]" : "bg-[#d4d4d8]"
                  }`}
                  style={{ height: 22 }}
                >
                  <span
                    className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${
                      field.value === "true" ? "translate-x-[21px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              )}

              {field.type === "image_field" && (
                <ImageUploadField
                  imageUrl={field.imageUrl}
                  onUpload={(url) => updateField(field.id, { imageUrl: url })}
                />
              )}

              {URL_FIELD_TYPES.includes(field.type) && (
                <input
                  type="url"
                  value={field.imageUrl ?? ""}
                  onChange={(e) =>
                    updateField(field.id, { imageUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#e4e4e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] nodrag"
                  placeholder={`Paste ${meta.label.toLowerCase()} URL...`}
                />
              )}

              <div className="absolute -right-[26px] top-1/2 -translate-y-1/2">
                <NodeHandle
                  id={field.id}
                  type="source"
                  position={Position.Right}
                />
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => addField("text_field")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#71717a] border border-dashed border-[#e4e4e7] rounded-lg hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-colors nodrag nopan"
          >
            <Type className="w-3 h-3" />
            Text
          </button>
          <button
            onClick={() => addField("image_field")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#71717a] border border-dashed border-[#e4e4e7] rounded-lg hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-colors nodrag nopan"
          >
            <ImageIcon className="w-3 h-3" />
            Image
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#71717a] border border-dashed border-[#e4e4e7] rounded-lg hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-colors nodrag nopan"
          >
            <Plus className="w-3 h-3" />
            More
          </button>
        </div>
      </div>
    </div>
  );
}

export const RequestInputsNode = memo(RequestInputsNodeComponent);
