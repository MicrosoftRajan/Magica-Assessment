# Magica — Phase-wise Development Documentation

This document explains how the project was built, phase by phase, with the most important code from each phase.

---

## Phase 1 — Foundation: Database, Auth & Project Setup

**Goal:** Next.js 16 app with PostgreSQL persistence and protected routes.

### Database Schema (`prisma/schema.prisma`)

Three models capture everything: the workflow graph (as JSON), each execution, and each node's result within an execution.

```prisma
model Workflow {
  id        String        @id @default(cuid())
  userId    String
  name      String        @default("Untitled Workflow")
  graph     Json          @default("{}")   // nodes + edges + viewport
  runs      WorkflowRun[]

  @@index([userId])
}

model WorkflowRun {
  id         String    @id @default(cuid())
  workflowId String
  status     RunStatus @default(PENDING)   // PENDING/RUNNING/SUCCESS/FAILED/PARTIAL
  scope      RunScope  @default(FULL)      // FULL/PARTIAL/SINGLE
  durationMs Int?
  nodeRuns   NodeRun[]
}

model NodeRun {
  id            String    @id @default(cuid())
  workflowRunId String
  nodeId        String
  nodeType      String
  status        RunStatus @default(PENDING)
  inputs        Json?
  output        Json?
  error         String?
  durationMs    Int?
}
```

### Auth (`src/middleware.ts`)

Clerk middleware protects every route except sign-in/sign-up. API routes call `requireUserId()` so users can only touch their own workflows.

```ts
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});
```

### Prisma 7 + Driver Adapter (`src/lib/db.ts`)

Prisma 7 requires an explicit driver adapter:

```ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const db = new PrismaClient({ adapter });
```

---

## Phase 2 — Canvas: React Flow + Zustand Store

**Goal:** Interactive node canvas with full undo/redo.

### Single source of truth (`src/stores/workflow-store.ts`)

One Zustand store owns nodes, edges, selection, history and execution state. Undo/redo snapshots the graph on structural changes, and **debounces field edits** so typing one sentence is one undo step, not thirty:

```ts
onNodesChange: (changes) => {
  const nodes = applyNodeChanges(changes, get().nodes);
  set({ nodes, isDirty: true });
  const structural = changes.some(
    (c) => c.type === "add" || c.type === "remove" ||
           (c.type === "position" && !c.dragging),
  );
  if (structural) get().pushHistory();
},

updateNodeData: (nodeId, data) => {
  // ...merge into node.data...
  clearTimeout(get().dataEditTimer);
  set({ dataEditTimer: setTimeout(() => get().pushHistory(), 600) });
},
```

### Node components

Each node type is a memoized React component registered once:

```ts
const nodeTypes = {
  "request-inputs": RequestInputsNode,
  "crop-image":     CropImageNode,
  "gemini":         GeminiNode,
  "image-gen":      ImageGenNode,
  "video-gen":      VideoGenNode,
  "response":       ResponseNode,
};
```

Inputs that are wired get disabled with a "connected via wire" indicator:

```tsx
const isPromptConnected = edges.some(
  (e) => e.target === id && e.targetHandle === "prompt",
);
<textarea disabled={isPromptConnected} ... />
```

---

## Phase 3 — Connections: Type Safety, Cycles & UX

**Goal:** Wires that can't produce an invalid graph, but are effortless to draw.

### Handle data types (`src/lib/graph-utils.ts`)

Every handle id maps to a data type. Dynamic field handles (`text_field_1718...`) resolve by prefix:

```ts
export function getHandleDataType(handleId?: string | null): DataType {
  if (!handleId) return "any";
  if (HANDLE_DATA_TYPES[handleId]) return HANDLE_DATA_TYPES[handleId];
  if (handleId.startsWith("text_field"))  return "text";
  if (handleId.startsWith("image_field")) return "image";
  return "any";
}

export function isValidConnection(source, target): boolean {
  const s = getHandleDataType(source), t = getHandleDataType(target);
  return s === "any" || t === "any" || s === t;
}
```

### Cycle prevention (DFS)

```ts
export function wouldCreateCycle(nodes, edges, newEdge): boolean {
  // build adjacency incl. the proposed edge, then DFS with a recursion stack
  function dfs(nodeId: string): boolean {
    if (stack.has(nodeId)) return true;      // back-edge = cycle
    if (visited.has(nodeId)) return false;
    visited.add(nodeId); stack.add(nodeId);
    for (const n of adjacency.get(nodeId) ?? []) if (dfs(n)) return true;
    stack.delete(nodeId);
    return false;
  }
}
```

### Drop-anywhere connect (`WorkflowCanvas.tsx`)

If a wire is dropped on a node body instead of a handle, we find the node under the pointer and auto-pick the best compatible handle (preferring free ones):

```ts
const handleConnectEnd = useCallback<OnConnectEnd>((event, state) => {
  if (state.isValid) return;                       // already snapped to a handle
  const el = document.elementFromPoint(x, y)?.closest(".react-flow__node");
  const droppedNode = nodes.find((n) => n.id === el?.getAttribute("data-id"));
  const targetHandle = findCompatibleTargetHandle(droppedNode, fromHandle.id, edges);
  if (targetHandle && !wouldCreateCycle(nodes, edges, connection)) {
    onConnect(connection);
  }
}, [nodes, edges, onConnect]);
```

Plus `connectionRadius={48}` for magnetic snapping and enlarged invisible hit areas on handles via CSS `::after`.

---

## Phase 4 — Execution Engine

**Goal:** Run a DAG correctly: ordered, parallel where possible, resumable from saved outputs.

### Topological layers (`src/lib/graph-utils.ts`)

Kahn's algorithm groups nodes into layers; everything in a layer runs in parallel:

```ts
export function getTopologicalLayers(nodeIds, edges): string[][] {
  // inDegree per node → repeatedly take all 0-degree nodes as one layer
  let queue = nodeIds.filter((id) => inDegree.get(id) === 0);
  while (queue.length) {
    layers.push([...queue]);
    queue = /* nodes whose inDegree just dropped to 0 */;
  }
  return layers;
}
```

### The engine loop (`src/lib/execution/engine.ts`)

```ts
export async function executeWorkflowGraph(nodes, edges, targetNodeIds, callbacks, seed?) {
  const outputs = new Map(seed);                     // pre-seeded for partial runs
  for (const layer of getTopologicalLayers(targetNodeIds, edges)) {
    await Promise.all(layer.map(async (nodeId) => {
      await callbacks.onNodeStart(nodeId);           // → DB: RUNNING
      try {
        const result = await executeNode(node, edges, outputs, nodeMap);
        outputs.set(nodeId, result);
        await callbacks.onNodeComplete(nodeId, { output: result, durationMs });
      } catch (error) {
        await callbacks.onNodeComplete(nodeId, { error: message, durationMs });
      }
    }));
  }
}
```

### Run scopes

- **FULL** — every node
- **PARTIAL** — selected nodes **plus all upstream** (`getUpstreamNodeIds`)
- **SINGLE** — one node only; upstream values are **seeded from the saved graph** instead of re-running:

```ts
if (scope === "single") {
  targetNodeIds = [...nodeIds];
  // Response nodes are display-only → refresh ones fed by this node too
  const downstreamResponses = edges
    .filter((e) => targetNodeIds.includes(e.source))
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n) => n?.type === "response").map((n) => n!.id);
  targetNodeIds = [...new Set([...targetNodeIds, ...downstreamResponses])];
  initialOutputs = seedOutputsFromGraph(nodes, targetNodeIds);
}
```

---

## Phase 5 — Background Jobs: Trigger.dev

**Goal:** Heavy work (FFmpeg, AI calls) off the request path, with status tracking.

### Task definition (`src/trigger/gemini.ts`)

```ts
export const geminiTask = task({
  id: "gemini-generate",
  run: async (payload: { model: string; prompt: string; imageUrls?: string[] }) => {
    const model = genAI.getGenerativeModel({ model: resolvedModel, ... });
    const parts = [{ text: payload.prompt }, ...inlineImages];  // vision support
    const result = await model.generateContent(parts);
    return { response: result.response.text() };
  },
});
```

### Trigger + poll from the API route

`triggerAndWait` only works *inside* tasks — from a Next.js route the correct pattern is **trigger then poll**:

```ts
const handle = await tasks.trigger<typeof geminiTask>("gemini-generate", {...});
const run = await runs.poll(handle, { pollIntervalMs: 1000 });
if (run.status !== "COMPLETED") throw new Error(run.error?.message);
```

### Crop Image (`src/trigger/crop-image.ts`)

Percentage-based crop with FFmpeg — probe dimensions, convert % → px, crop, return the image.

---

## Phase 6 — API Routes & Run History

**Goal:** REST endpoints with validation; every run auditable.

```
GET/POST       /api/workflows                  list / create
GET/PATCH/DEL  /api/workflows/:id              read / save graph / delete
POST           /api/workflows/:id/execute      run (full/partial/single)
GET            /api/workflows/:id/runs         history with node details
GET            /api/uploads/transloadit        signed upload params
```

The execute route creates `WorkflowRun` + `NodeRun` rows up front, then the engine's callbacks update them live:

```ts
onNodeComplete: async (nodeId, result) => {
  await db.nodeRun.update({
    where: { id: nodeRunMap.get(nodeId) },
    data: {
      status: result.error ? "FAILED" : "SUCCESS",
      output: result.output, error: result.error, durationMs: result.durationMs,
    },
  });
},
```

Zod validates every request body (`src/lib/validation.ts`).

### Signed uploads (Transloadit)

The server signs upload params (secret never reaches the browser). Two gotchas solved:
- signature must be prefixed with the algorithm: `"sha384:" + hmac`
- `expires` must be `YYYY/MM/DD HH:mm:ss+00:00` format

If Transloadit fails the client falls back to a base64 data-URL, so uploads never block the demo.

---

## Phase 7 — UI: Magica-style Polish

**Goal:** Match the reference product's look.

- **Sidebar** (`src/components/Sidebar.tsx`) — nav, live workflow list, Clerk profile, collapsible
- **Floating canvas chrome** — name pill (top-left), Est/Bal pills + circular purple Run button (top-right), pill toolbar (bottom-center)
- **Field type picker** — Request Inputs "+" opens a dropdown: Text, Number, Boolean, Image, Audio, Video, Media, File
- **"No output yet"** placeholder sections in every generator node
- Running nodes get a pulsing glow; edges animate while executing

---

## Phase 8 — Generative Nodes: Image & Video

**Goal:** Extend the same architecture with two new node types — proof the system is extensible.

Adding a node type touches exactly five places:

1. `types.ts` — data interface + `NODE_TYPES` entry
2. `graph-utils.ts` — handle data types + target/source handle registry
3. `src/trigger/*.ts` — the background task
4. `engine.ts` — an `executeX()` case (trigger + poll)
5. A React component + `nodeTypes` registration

```ts
// image-gen: Gemini's image model returns inlineData parts
const result = await model.generateContent(parts);
for (const part of candidate.content?.parts ?? []) {
  if (part.inlineData) {
    images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
  }
}
```

```ts
// video-gen: Veo is a long-running operation → start, then poll the operation
const op = await fetch(`${base}/models/${model}:predictLongRunning?key=...`);
for (let i = 0; i < 60; i++) {
  const status = await poll(op.name);
  if (status.done) return { video: status.response...video.uri };
}
```

> Image/video models need a billing-enabled Google AI key; on free tier the nodes surface a clear quota error.

---

## Key Debugging Stories (worth knowing)

| Problem | Root cause | Fix |
|---|---|---|
| Run did nothing | `triggerAndWait` outside a task context | switched to `tasks.trigger` + `runs.poll` |
| Gemini 404 | `gemini-1.5-pro` retired | model aliases map old → current models |
| Gemini 429 | Pro models have **zero** free-tier quota | default to `gemini-2.5-flash` (verified working) |
| Transloadit 400 | missing `sha384:` signature prefix + wrong expires format | both fixed server-side |
| Crop → Response wire impossible | `result` handle typed `text`, crop output is `image` | `result` accepts `any`; Response renders text/image/video |
| Response empty after single run | display node never executed in SINGLE scope | single runs auto-include directly-connected Response nodes |

---

## How to Demo (2 minutes)

1. Sign in → create workflow
2. Request Inputs: add a Text + an Image field (show the type dropdown)
3. Wire: image → Crop Image → Response; text → Gemini → Response
4. Hit **Run** — watch nodes glow, then Response shows the cropped image *and* the Gemini text
5. Open History — every run with per-node status and durations
6. Open DevTools console — candidate LinkedIn logged on every page
