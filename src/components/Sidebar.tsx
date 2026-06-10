"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Plus,
  Search,
  MessageSquare,
  FolderOpen,
  LibraryBig,
  Workflow,
  Boxes,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";

interface WorkflowItem {
  id: string;
  name: string;
}

const NAV_ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: "Tasks", icon: MessageSquare },
  { label: "Projects", icon: FolderOpen },
  { label: "Library", icon: LibraryBig },
  { label: "Flow", icon: Workflow },
  { label: "Nodes", icon: Boxes },
  { label: "API / MCP", icon: BookOpen },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setWorkflows(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [pathname]);

  const createWorkflow = async () => {
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Workflow" }),
    });
    if (res.ok) {
      const wf = await res.json();
      router.push(`/workflow/${wf.id}`);
    }
  };

  if (collapsed) {
    return (
      <aside className="flex flex-col items-center w-12 h-full bg-white border-r border-[#ececf0] py-3 gap-2 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-[#f4f4f5] text-[#71717a]"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col w-[210px] h-full bg-white border-r border-[#ececf0] shrink-0">
      <div className="flex items-center justify-between px-4 py-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[17px] font-bold text-[#18181b] tracking-tight"
        >
          <span className="font-serif italic">N</span>extFlow
        </button>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-md hover:bg-[#f4f4f5] text-[#a1a1aa]"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 space-y-0.5">
        <button
          onClick={createWorkflow}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-[13px] text-[#3f3f46] rounded-lg hover:bg-[#f4f4f5] transition-colors"
        >
          <Plus className="w-4 h-4 text-[#71717a]" />
          New task
        </button>
        <button className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-[13px] text-[#3f3f46] rounded-lg hover:bg-[#f4f4f5] transition-colors">
          <Search className="w-4 h-4 text-[#71717a]" />
          Search tasks
        </button>
      </div>

      <div className="mt-4 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-[13px] text-[#3f3f46] rounded-lg hover:bg-[#f4f4f5] transition-colors"
          >
            <Icon className="w-4 h-4 text-[#71717a]" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto mt-4 px-3">
        {workflows.length === 0 ? (
          <p className="text-xs text-[#a1a1aa] text-center mt-6">No tasks yet</p>
        ) : (
          <div className="space-y-0.5">
            {workflows.map((wf) => {
              const active = pathname === `/workflow/${wf.id}`;
              return (
                <button
                  key={wf.id}
                  onClick={() => router.push(`/workflow/${wf.id}`)}
                  className={`block w-full text-left px-2.5 py-1.5 text-[12.5px] rounded-lg truncate transition-colors ${
                    active
                      ? "bg-[#f0edfd] text-[#6d28d9] font-medium"
                      : "text-[#52525b] hover:bg-[#f4f4f5]"
                  }`}
                >
                  {wf.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 pb-3 space-y-2">
        <button className="flex items-center justify-center gap-2 w-full px-3 py-1.5 text-[13px] text-[#3f3f46] border border-[#e8e8ec] rounded-full hover:bg-[#f4f4f5] transition-colors">
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <UserButton />
          <span className="text-[13px] font-medium text-[#3f3f46] truncate">
            {user?.fullName ?? user?.username ?? "Account"}
          </span>
        </div>
      </div>
    </aside>
  );
}
