import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import {
  isValidConnection,
  wouldCreateCycle,
} from "@/lib/graph-utils";
import { NODE_TYPES } from "@/lib/types";

export type ExecuteScope = "full" | "partial" | "single";
export type ExecuteHandler = (
  nodeIds: string[],
  scope: ExecuteScope,
) => Promise<void>;

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeIds: string[];
  runningNodeIds: Set<string>;
  history: HistoryState[];
  historyIndex: number;
  isDirty: boolean;
  executeHandler: ExecuteHandler | null;
  dataEditTimer: ReturnType<typeof setTimeout> | null;

  setGraph: (nodes: Node[], edges: Edge[], viewport?: Viewport) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => boolean;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  deleteNode: (nodeId: string) => void;
  deleteSelectedNodes: () => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setRunningNodeIds: (ids: Set<string>) => void;
  setViewport: (viewport: Viewport) => void;
  setExecuteHandler: (handler: ExecuteHandler | null) => void;
  runNode: (nodeId: string, scope?: ExecuteScope) => Promise<void>;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  resetDirty: () => void;
  exportGraph: () => { nodes: Node[]; edges: Edge[]; viewport: Viewport };
  importGraph: (data: { nodes: Node[]; edges: Edge[]; viewport?: Viewport }) => void;
}

const MAX_HISTORY = 50;
const DATA_EDIT_DEBOUNCE_MS = 400;

function snapshot(state: WorkflowState): HistoryState {
  return {
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges),
  };
}

function isProtectedNode(node: Node | undefined): boolean {
  if (!node) return true;
  const protectedTypes: Set<string> = new Set([
    NODE_TYPES.REQUEST_INPUTS,
    NODE_TYPES.RESPONSE,
  ]);
  return protectedTypes.has(node.type ?? "") || node.deletable === false;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  runningNodeIds: new Set(),
  history: [],
  historyIndex: -1,
  isDirty: false,
  executeHandler: null,
  dataEditTimer: null,

  setGraph: (nodes, edges, viewport) => {
    set({
      nodes,
      edges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
      history: [{ nodes: structuredClone(nodes), edges: structuredClone(edges) }],
      historyIndex: 0,
      isDirty: false,
    });
  },

  pushHistory: () => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot(get()));

    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  onNodesChange: (changes) => {
    const hasStructural = changes.some(
      (c) => c.type === "remove" || c.type === "add",
    );
    const hasPositionEnd = changes.some(
      (c) =>
        c.type === "position" &&
        "dragging" in c &&
        c.dragging === false,
    );

    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));

    if (hasStructural || hasPositionEnd) {
      get().pushHistory();
    }
  },

  onEdgesChange: (changes) => {
    const hasStructural = changes.some(
      (c) => c.type === "remove" || c.type === "add",
    );

    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));

    if (hasStructural) {
      get().pushHistory();
    }
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();

    if (
      !isValidConnection(connection.sourceHandle, connection.targetHandle)
    ) {
      return false;
    }

    if (
      wouldCreateCycle(nodes, edges, {
        source: connection.source!,
        target: connection.target!,
      })
    ) {
      return false;
    }

    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: "animated",
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
    }));

    get().pushHistory();
    return true;
  },

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
    get().pushHistory();
  },

  updateNodeData: (nodeId, data) => {
    const { dataEditTimer } = get();

    if (dataEditTimer) clearTimeout(dataEditTimer);

    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
      isDirty: true,
      dataEditTimer: setTimeout(() => {
        get().pushHistory();
        set({ dataEditTimer: null });
      }, DATA_EDIT_DEBOUNCE_MS),
    }));
  },

  deleteNode: (nodeId) => {
    const { nodes, edges } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (isProtectedNode(node)) return;

    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      ),
      selectedNodeIds: get().selectedNodeIds.filter((id) => id !== nodeId),
    });

    get().pushHistory();
  },

  deleteSelectedNodes: () => {
    const { selectedNodeIds, nodes, edges } = get();

    const toDelete = selectedNodeIds.filter((id) => {
      const node = nodes.find((n) => n.id === id);
      return !isProtectedNode(node);
    });

    if (toDelete.length === 0) return;

    set({
      nodes: nodes.filter((n) => !toDelete.includes(n.id)),
      edges: edges.filter(
        (e) => !toDelete.includes(e.source) && !toDelete.includes(e.target),
      ),
      selectedNodeIds: [],
    });

    get().pushHistory();
  },

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  setRunningNodeIds: (ids) => set({ runningNodeIds: ids }),

  setViewport: (viewport) => set({ viewport }),

  setExecuteHandler: (handler) => set({ executeHandler: handler }),

  runNode: async (nodeId, scope = "single") => {
    const { executeHandler } = get();
    if (executeHandler) {
      await executeHandler([nodeId], scope);
    }
  },

  undo: () => {
    const { history, historyIndex, dataEditTimer } = get();
    if (dataEditTimer) clearTimeout(dataEditTimer);

    if (historyIndex <= 0) return;

    const prev = history[historyIndex - 1];
    set({
      nodes: structuredClone(prev.nodes),
      edges: structuredClone(prev.edges),
      historyIndex: historyIndex - 1,
      isDirty: true,
      dataEditTimer: null,
    });
  },

  redo: () => {
    const { history, historyIndex, dataEditTimer } = get();
    if (dataEditTimer) clearTimeout(dataEditTimer);

    if (historyIndex >= history.length - 1) return;

    const next = history[historyIndex + 1];
    set({
      nodes: structuredClone(next.nodes),
      edges: structuredClone(next.edges),
      historyIndex: historyIndex + 1,
      isDirty: true,
      dataEditTimer: null,
    });
  },

  resetDirty: () => set({ isDirty: false }),

  exportGraph: () => {
    const { nodes, edges, viewport } = get();
    return { nodes, edges, viewport };
  },

  importGraph: (data) => {
    get().setGraph(data.nodes, data.edges, data.viewport);
    set({ isDirty: true });
  },
}));
