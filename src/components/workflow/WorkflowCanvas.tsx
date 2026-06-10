"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type OnConnectEnd,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { useWorkflowStore } from "@/stores/workflow-store";
import { RequestInputsNode } from "./nodes/RequestInputsNode";
import { CropImageNode } from "./nodes/CropImageNode";
import { GeminiNode } from "./nodes/GeminiNode";
import { ImageGenNode } from "./nodes/ImageGenNode";
import { VideoGenNode } from "./nodes/VideoGenNode";
import { ResponseNode } from "./nodes/ResponseNode";
import { AnimatedEdge } from "./edges/AnimatedEdge";
import { CanvasToolbar } from "./CanvasToolbar";
import { NodePicker } from "./NodePicker";
import {
  isValidConnection,
  wouldCreateCycle,
  findCompatibleTargetHandle,
  findCompatibleSourceHandle,
} from "@/lib/graph-utils";
import { NODE_TYPES } from "@/lib/types";
import type { ExecuteScope } from "@/stores/workflow-store";

const nodeTypes = {
  [NODE_TYPES.REQUEST_INPUTS]: RequestInputsNode,
  [NODE_TYPES.CROP_IMAGE]: CropImageNode,
  [NODE_TYPES.GEMINI]: GeminiNode,
  [NODE_TYPES.IMAGE_GEN]: ImageGenNode,
  [NODE_TYPES.VIDEO_GEN]: VideoGenNode,
  [NODE_TYPES.RESPONSE]: ResponseNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

interface WorkflowCanvasProps {
  workflowId: string;
  onExecute: (nodeIds?: string[], scope?: ExecuteScope) => Promise<void>;
  isExecuting: boolean;
}

function WorkflowCanvasInner({ onExecute, isExecuting }: WorkflowCanvasProps) {
  const {
    nodes,
    edges,
    viewport,
    runningNodeIds,
    history,
    historyIndex,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteSelectedNodes,
    setSelectedNodeIds,
    setViewport,
    undo,
    redo,
  } = useWorkflowStore();

  const { zoomIn, zoomOut, fitView, screenToFlowPosition } = useReactFlow();
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const nodesWithRunning = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        className: runningNodeIds.has(n.id) ? "node-running" : undefined,
      })),
    [nodes, runningNodeIds],
  );

  const isValidConnectionFn = useCallback(
    (connection: {
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }) => {
      if (
        !isValidConnection(connection.sourceHandle, connection.targetHandle)
      ) {
        return false;
      }
      return !wouldCreateCycle(nodes, edges, {
        source: connection.source,
        target: connection.target,
      });
    },
    [nodes, edges],
  );

  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      onConnect(connection);
    },
    [onConnect],
  );

  // Drop a wire anywhere on a node and we auto-pick a compatible handle
  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState) => {
      if (connectionState.isValid) return;
      const { fromNode, fromHandle } = connectionState;
      if (!fromNode || !fromHandle) return;

      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;
      const nodeEl = document
        .elementFromPoint(clientX, clientY)
        ?.closest(".react-flow__node");
      const droppedNodeId = nodeEl?.getAttribute("data-id");
      if (!droppedNodeId || droppedNodeId === fromNode.id) return;

      const droppedNode = nodes.find((n) => n.id === droppedNodeId);
      if (!droppedNode) return;

      let connection: {
        source: string;
        target: string;
        sourceHandle: string;
        targetHandle: string;
      } | null = null;

      if (fromHandle.type === "source") {
        const targetHandle = findCompatibleTargetHandle(
          droppedNode,
          fromHandle.id,
          edges,
        );
        if (targetHandle) {
          connection = {
            source: fromNode.id,
            target: droppedNodeId,
            sourceHandle: fromHandle.id ?? "",
            targetHandle,
          };
        }
      } else {
        const sourceHandle = findCompatibleSourceHandle(
          droppedNode,
          fromHandle.id,
        );
        if (sourceHandle) {
          connection = {
            source: droppedNodeId,
            target: fromNode.id,
            sourceHandle,
            targetHandle: fromHandle.id ?? "",
          };
        }
      }

      if (
        connection &&
        !wouldCreateCycle(nodes, edges, connection) &&
        !edges.some(
          (e) =>
            e.source === connection!.source &&
            e.target === connection!.target &&
            e.sourceHandle === connection!.sourceHandle &&
            e.targetHandle === connection!.targetHandle,
        )
      ) {
        onConnect(connection);
      }
    },
    [nodes, edges, onConnect],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      setSelectedNodeIds(selected.map((n) => n.id));
    },
    [setSelectedNodeIds],
  );

  const handleAddNodeType = useCallback(
    (type: string) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newNode: Node = {
        id: `${type}-${uuidv4().slice(0, 8)}`,
        type,
        position,
        data:
          type === NODE_TYPES.CROP_IMAGE
            ? { x: 0, y: 0, width: 100, height: 100 }
            : type === NODE_TYPES.GEMINI
              ? { model: "gemini-2.5-flash" }
              : type === NODE_TYPES.IMAGE_GEN
                ? { mode: "text" }
                : type === NODE_TYPES.VIDEO_GEN
                  ? {
                      mode: "image",
                      duration: 5,
                      aspectRatio: "16:9",
                      resolution: "720p",
                      generateAudio: true,
                    }
                  : {},
      };

      addNode(newNode);
    },
    [addNode, screenToFlowPosition],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelectedNodes();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, deleteSelectedNodes]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 relative h-full">
      <ReactFlow
        nodes={nodesWithRunning}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        connectionRadius={48}
        isValidConnection={isValidConnectionFn}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={viewport}
        onViewportChange={setViewport}
        onSelectionChange={handleSelectionChange}
        fitView
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d4d4d8"
        />
        <MiniMap
          position="bottom-right"
          className="!bottom-20 !right-4"
          nodeColor="#e4e4e7"
          maskColor="rgba(0,0,0,0.05)"
        />
      </ReactFlow>

      <CanvasToolbar
        zoom={viewport.zoom}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView({ padding: 0.2 })}
        onAddNode={() => setPickerOpen(true)}
        onDelete={deleteSelectedNodes}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      <NodePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddNodeType}
      />
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
