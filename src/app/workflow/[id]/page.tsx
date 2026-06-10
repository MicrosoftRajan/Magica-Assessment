"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  History,
  ArrowLeft,
  Loader2,
  Download,
  Upload,
  Save,
} from "lucide-react";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { HistoryPanel } from "@/components/workflow/HistoryPanel";
import { Sidebar } from "@/components/Sidebar";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Edge, Node } from "@xyflow/react";
import { NODE_TYPES } from "@/lib/types";

interface WorkflowData {
  id: string;
  name: string;
  graph: {
    nodes: Node[];
    edges: Edge[];
    viewport?: { x: number; y: number; zoom: number };
  };
}

export default function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const {
    setGraph,
    exportGraph,
    isDirty,
    resetDirty,
    selectedNodeIds,
    setRunningNodeIds,
    updateNodeData,
    setExecuteHandler,
  } = useWorkflowStore();

  const fetchWorkflow = useCallback(async () => {
    const res = await fetch(`/api/workflows/${id}`);
    if (res.ok) {
      const data = await res.json();
      setWorkflow(data);
      setNameValue(data.name);
      const graph = data.graph as WorkflowData["graph"];
      setGraph(
        graph.nodes as Node[],
        graph.edges,
        graph.viewport,
      );
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }, [id, router, setGraph]);

  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    const res = await fetch(`/api/workflows/${id}/runs`);
    if (res.ok) {
      setRuns(await res.json());
    }
    setRunsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  useEffect(() => {
    if (historyOpen) fetchRuns();
  }, [historyOpen, fetchRuns]);

  const saveWorkflow = async () => {
    setSaving(true);
    const graph = exportGraph();
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph, name: nameValue }),
    });
    resetDirty();
    setSaving(false);
  };

  const executeWorkflow = useCallback(
    async (
      nodeIds?: string[],
      scope: "full" | "partial" | "single" = "full",
    ) => {
    if (isDirty) await saveWorkflow();

    setExecuting(true);

    const state = useWorkflowStore.getState();
    let runningIds: Set<string>;

    if (scope === "single" && nodeIds?.length) {
      runningIds = new Set(nodeIds);
    } else if (nodeIds?.length) {
      const upstream = new Set(nodeIds);
      for (const edge of state.edges) {
        if (nodeIds.includes(edge.target)) upstream.add(edge.source);
      }
      let changed = true;
      while (changed) {
        changed = false;
        for (const edge of state.edges) {
          if (upstream.has(edge.target) && !upstream.has(edge.source)) {
            upstream.add(edge.source);
            changed = true;
          }
        }
      }
      runningIds = upstream;
    } else {
      runningIds = new Set(state.nodes.map((n) => n.id));
    }

    setRunningNodeIds(runningIds);

    try {
      const res = await fetch(`/api/workflows/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeIds,
          scope,
        }),
      });

      if (res.ok) {
        const run = await res.json();

        for (const nodeRun of run.nodeRuns) {
          if (nodeRun.status === "SUCCESS" && nodeRun.output) {
            const output = nodeRun.output as Record<string, unknown>;

            if (nodeRun.nodeType === NODE_TYPES.GEMINI && output.response) {
              updateNodeData(nodeRun.nodeId, {
                response: output.response,
              });
            }
            if (
              nodeRun.nodeType === NODE_TYPES.CROP_IMAGE &&
              output.outputImage
            ) {
              updateNodeData(nodeRun.nodeId, {
                outputImage: output.outputImage,
              });
            }
            if (nodeRun.nodeType === NODE_TYPES.IMAGE_GEN && output.images) {
              updateNodeData(nodeRun.nodeId, {
                outputImages: output.images,
              });
            }
            if (nodeRun.nodeType === NODE_TYPES.VIDEO_GEN && output.video) {
              updateNodeData(nodeRun.nodeId, {
                outputVideo: output.video,
              });
            }
            if (nodeRun.nodeType === NODE_TYPES.RESPONSE && output.result) {
              updateNodeData(nodeRun.nodeId, { result: output.result });
            }
          }
        }

        if (historyOpen) fetchRuns();
      }
    } finally {
      setExecuting(false);
      setRunningNodeIds(new Set());
    }
  },
    [id, isDirty, historyOpen, fetchRuns, updateNodeData],
  );

  useEffect(() => {
    setExecuteHandler(executeWorkflow);
    return () => setExecuteHandler(null);
  }, [executeWorkflow, setExecuteHandler]);

  const handleExport = () => {
    const graph = exportGraph();
    const blob = new Blob([JSON.stringify(graph, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nameValue || "workflow"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const graph = JSON.parse(text);
      setGraph(graph.nodes, graph.edges, graph.viewport);
    };
    input.click();
  };

  const saveName = async () => {
    setEditingName(false);
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameValue }),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#71717a]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f7f7f8]">
      <Sidebar />

      <div className="relative flex-1 flex overflow-hidden">
        <div className="relative flex-1">
          <WorkflowCanvas
            workflowId={id}
            onExecute={executeWorkflow}
            isExecuting={executing}
          />

          {/* Floating workflow name pill (top-left) */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white border border-[#ececf0] rounded-full shadow-sm pl-2 pr-3 py-1.5">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1 rounded-full hover:bg-[#f4f4f5] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#71717a]" />
            </button>
            {editingName ? (
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="text-[13px] font-medium text-[#18181b] bg-transparent outline-none w-44"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-[13px] font-medium text-[#18181b] hover:text-[#6d28d9] max-w-[220px] truncate"
              >
                {nameValue}
              </button>
            )}
            {isDirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                title="Unsaved changes"
              />
            )}
          </div>

          {/* Floating actions (top-right) */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-[#ececf0] rounded-full shadow-sm px-3 py-1.5 text-[11.5px] text-[#52525b]">
              <span>
                Est <span className="font-semibold text-[#18181b]">0.01 M</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-[#ececf0] rounded-full shadow-sm px-3 py-1.5 text-[11.5px] text-[#52525b]">
              <span>
                Bal <span className="font-semibold text-[#18181b]">$164.85 M</span>
              </span>
            </div>

            <div className="flex items-center gap-0.5 bg-white border border-[#ececf0] rounded-full shadow-sm px-1 py-1">
              <button
                onClick={handleImport}
                className="p-1.5 rounded-full hover:bg-[#f4f4f5] text-[#71717a] transition-colors"
                title="Import workflow"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 rounded-full hover:bg-[#f4f4f5] text-[#71717a] transition-colors"
                title="Export workflow"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={saveWorkflow}
                disabled={saving}
                className="p-1.5 rounded-full hover:bg-[#f4f4f5] text-[#71717a] transition-colors disabled:opacity-50"
                title="Save workflow"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <button
              onClick={() => {
                if (selectedNodeIds.length === 1) {
                  executeWorkflow(selectedNodeIds, "single");
                } else if (selectedNodeIds.length > 1) {
                  executeWorkflow(selectedNodeIds, "partial");
                } else {
                  executeWorkflow(undefined, "full");
                }
              }}
              disabled={executing}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md transition-colors disabled:opacity-50"
              title={
                selectedNodeIds.length === 1
                  ? "Run selected node"
                  : selectedNodeIds.length > 1
                    ? "Run selected nodes"
                    : "Run workflow"
              }
            >
              {executing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={`flex items-center justify-center w-9 h-9 rounded-full border shadow-sm transition-colors ${
                historyOpen
                  ? "bg-[#f0edfd] border-[#ddd6fe] text-[#6d28d9]"
                  : "bg-white border-[#ececf0] text-[#71717a] hover:bg-[#f4f4f5]"
              }`}
              title="Run history"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        <HistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          runs={runs}
          loading={runsLoading}
        />
      </div>
    </div>
  );
}
