"use client";

import { Handle, Position, type HandleProps } from "@xyflow/react";
import { getHandleDataType } from "@/lib/graph-utils";

interface NodeHandleProps extends Omit<HandleProps, "id"> {
  id: string;
  label?: string;
}

export function NodeHandle({ id, label, type, position, ...props }: NodeHandleProps) {
  const dataType = getHandleDataType(id);
  const className =
    dataType === "image"
      ? "handle-image !w-2.5 !h-2.5"
      : dataType === "text"
        ? "handle-text !w-2.5 !h-2.5"
        : "handle-any !w-2.5 !h-2.5";

  return (
    <div className="relative flex items-center gap-2">
      {type === "target" && label && (
        <span className="text-[11px] text-[#71717a] whitespace-nowrap">{label}</span>
      )}
      <Handle
        id={id}
        type={type}
        position={position}
        className={className}
        {...props}
      />
      {type === "source" && label && (
        <span className="text-[11px] text-[#71717a] whitespace-nowrap">{label}</span>
      )}
    </div>
  );
}
