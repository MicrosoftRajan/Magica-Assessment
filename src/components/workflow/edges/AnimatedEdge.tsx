"use client";

import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { getHandleDataType } from "@/lib/graph-utils";

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const dataType = getHandleDataType(sourceHandleId);
  const strokeColor =
    dataType === "image"
      ? "#3b82f6"
      : dataType === "text"
        ? "#f97316"
        : "#a855f7";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 2.5,
          strokeDasharray: "6 4",
          animation: "edge-flow 0.8s linear infinite",
        }}
      />
      <circle r="4" fill={strokeColor} opacity={0.9}>
        <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <circle r="8" fill={strokeColor} opacity={0.15}>
        <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}
