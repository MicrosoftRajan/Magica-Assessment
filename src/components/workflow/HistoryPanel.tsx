"use client";

import { useState } from "react";
import {
  History,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

interface NodeRun {
  id: string;
  nodeId: string;
  nodeLabel: string | null;
  status: string;
  output: unknown;
  error: string | null;
  durationMs: number | null;
}

interface WorkflowRun {
  id: string;
  status: string;
  scope: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  nodeRuns: NodeRun[];
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  runs: WorkflowRun[];
  loading: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
    SUCCESS: { bg: "bg-green-50", text: "text-green-700", icon: CheckCircle2 },
    FAILED: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
    PARTIAL: { bg: "bg-yellow-50", text: "text-yellow-700", icon: AlertCircle },
    RUNNING: { bg: "bg-blue-50", text: "text-blue-700", icon: Clock },
    PENDING: { bg: "bg-gray-50", text: "text-gray-600", icon: Clock },
  };

  const c = config[status] ?? config.PENDING;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function HistoryPanel({ open, onClose, runs, loading }: HistoryPanelProps) {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  if (!open) return null;

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-80 border-l border-[#e4e4e7] bg-white flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e4e7]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#71717a]" />
          <span className="text-sm font-medium text-[#18181b]">History</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#f4f4f5]">
          <X className="w-4 h-4 text-[#71717a]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-[#71717a]">
            Loading...
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <History className="w-8 h-8 text-[#d4d4d8] mb-2" />
            <p className="text-sm text-[#71717a] text-center">
              No runs yet. Execute the workflow to see history.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e4e4e7]">
            {runs.map((run) => (
              <div key={run.id} className="px-4 py-3">
                <button
                  onClick={() =>
                    setExpandedRun(expandedRun === run.id ? null : run.id)
                  }
                  className="flex items-center gap-2 w-full text-left"
                >
                  {expandedRun === run.id ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#71717a]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#71717a]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#18181b]">
                        {formatDate(run.startedAt)}
                      </span>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#71717a]">
                        {run.scope.toLowerCase()}
                      </span>
                      <span className="text-[10px] text-[#71717a]">
                        {formatDuration(run.durationMs)}
                      </span>
                    </div>
                  </div>
                </button>

                {expandedRun === run.id && (
                  <div className="mt-2 ml-5 space-y-2">
                    {run.nodeRuns.map((nr) => (
                      <div
                        key={nr.id}
                        className="p-2 bg-[#fafafa] rounded-lg text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-[#18181b]">
                            {nr.nodeLabel ?? nr.nodeId}
                          </span>
                          <StatusBadge status={nr.status} />
                        </div>
                        <div className="text-[10px] text-[#71717a] mb-1">
                          {formatDuration(nr.durationMs)}
                        </div>
                        {nr.error && (
                          <p className="text-[10px] text-red-600">{nr.error}</p>
                        )}
                        {nr.output != null && (
                          <pre className="text-[10px] text-[#52525b] whitespace-pre-wrap break-all max-h-20 overflow-y-auto">
                            {typeof nr.output === "string"
                              ? nr.output
                              : JSON.stringify(nr.output, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
