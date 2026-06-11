"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Workflow,
  Pencil,
  Trash2,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

interface WorkflowItem {
  id: string;
  name: string;
  updatedAt: string;
  isRunning: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    const res = await fetch("/api/workflows");
    if (res.ok) {
      setWorkflows(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const createWorkflow = async (isSample = false) => {
    setCreating(true);
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSample }),
    });
    if (res.ok) {
      const workflow = await res.json();
      router.push(`/workflow/${workflow.id}`);
    }
    setCreating(false);
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    setMenuOpenId(null);
    fetchWorkflows();
  };

  const startRename = (wf: WorkflowItem) => {
    setRenamingId(wf.id);
    setRenameValue(wf.name);
    setMenuOpenId(null);
  };

  const saveRename = async (id: string) => {
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    setRenamingId(null);
    fetchWorkflows();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex min-h-screen bg-[#f7f7f8]">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#18181b]">Workflows</h1>
            <p className="text-sm text-[#71717a] mt-1">
              Create and manage your LLM workflows
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createWorkflow(true)}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#18181b] bg-white border border-[#e4e4e7] rounded-lg hover:bg-[#f4f4f5] transition-colors disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Sample Workflow
            </button>
            <button
              onClick={() => createWorkflow(false)}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create New Workflow
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#71717a]" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-[#e4e4e7]">
            <Workflow className="w-12 h-12 text-[#d4d4d8] mb-4" />
            <h2 className="text-lg font-medium text-[#18181b] mb-1">
              No workflows yet
            </h2>
            <p className="text-sm text-[#71717a] mb-6">
              Create your first workflow to get started
            </p>
            <button
              onClick={() => createWorkflow(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8]"
            >
              <Plus className="w-4 h-4" />
              Create New Workflow
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e4e4e7] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e4e4e7] bg-[#fafafa]">
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">
                    Last Edited
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((wf) => (
                  <tr
                    key={wf.id}
                    className="border-b border-[#e4e4e7] last:border-0 hover:bg-[#fafafa] transition-colors"
                  >
                    <td className="px-6 py-4">
                      {renamingId === wf.id ? (
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => saveRename(wf.id)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && saveRename(wf.id)
                          }
                          className="px-2 py-1 border border-[#e4e4e7] rounded text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => router.push(`/workflow/${wf.id}`)}
                          className="text-sm font-medium text-[#18181b] hover:text-[#2563eb] transition-colors"
                        >
                          {wf.name}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#71717a]">
                      {formatDate(wf.updatedAt)}
                    </td>
                    <td className="px-6 py-4">
                      {wf.isRunning ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Running
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f4f4f5] text-[#71717a]">
                          Idle
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() =>
                          setMenuOpenId(menuOpenId === wf.id ? null : wf.id)
                        }
                        className="p-1.5 rounded-lg hover:bg-[#f4f4f5] transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-[#71717a]" />
                      </button>
                      {menuOpenId === wf.id && (
                        <div className="absolute right-6 top-12 z-10 bg-white border border-[#e4e4e7] rounded-lg shadow-lg py-1 min-w-[140px]">
                          <button
                            onClick={() => router.push(`/workflow/${wf.id}`)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#18181b] hover:bg-[#f4f4f5]"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => startRename(wf)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#18181b] hover:bg-[#f4f4f5]"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Rename
                          </button>
                          <button
                            onClick={() => deleteWorkflow(wf.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
