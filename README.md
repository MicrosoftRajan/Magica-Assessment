# Magica — AI Workflow Builder

A visual, node-based AI workflow builder inspired by Galaxy.ai's Workflow Builder. Build pipelines by wiring nodes on a canvas, run them (fully, partially, or a single node), and every run is persisted with full history.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React Flow](https://img.shields.io/badge/React_Flow-12-purple) ![Prisma](https://img.shields.io/badge/Prisma-7-blue) ![Trigger.dev](https://img.shields.io/badge/Trigger.dev-v4-green)

## Features

### Canvas & Nodes
- **Request Inputs** — dynamic input fields: Text, Number, Boolean, Image (Transloadit upload), Audio, Video, Media, File
- **Crop Image** — percentage-based cropping via FFmpeg, runs as a background job
- **Gemini** — Google Gemini chat node (model picker, system prompt, vision input, temperature settings)
- **Gemini Image 2** — image generation with Text-to-Image / Image-to-Image modes
- **Veo Video** — video generation with duration, aspect ratio, resolution and audio controls
- **Response** — renders final outputs (text, images, and video) from any number of incoming wires

### Connections
- **Type-safe wires** — text outputs only connect to text inputs, image to image (with `any` passthrough)
- **Cycle prevention** — DAG validation blocks circular connections
- **Drop-anywhere connect** — drop a wire anywhere on a node and it auto-picks a compatible handle
- **Magnetic snapping** + enlarged handle hit areas

### Execution
- **Run scopes** — full workflow, selected nodes (with upstream), or a single node
- **Parallel execution** — independent nodes in the same topological layer run concurrently
- **Background jobs** — Crop Image, Gemini, Image and Video generation run on Trigger.dev workers
- **Run history** — every workflow run and node run persisted (status, inputs, outputs, duration)

### App
- Clerk authentication (sign-in / sign-up, protected routes)
- Workflow CRUD with autosave-before-run, import/export as JSON
- Undo/redo (structure + debounced field edits), node context menus
- Candidate LinkedIn logged to the console on every page load

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Canvas | React Flow (@xyflow/react) |
| State | Zustand |
| Database | PostgreSQL (Prisma Postgres) + Prisma 7 |
| Auth | Clerk |
| Background jobs | Trigger.dev v4 |
| AI | Google Gemini (text, vision, image gen) + Veo (video) |
| Uploads | Transloadit (with base64 fallback) |
| Styling | Tailwind CSS 4 |

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — PostgreSQL connection string (e.g. Prisma Postgres)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from [Clerk](https://clerk.com)
- `GOOGLE_GENERATIVE_AI_API_KEY` — from [Google AI Studio](https://aistudio.google.com)
- `TRIGGER_SECRET_KEY` / `TRIGGER_PROJECT_ID` — from [Trigger.dev](https://trigger.dev)
- `TRANSLOADIT_AUTH_KEY` / `TRANSLOADIT_AUTH_SECRET` — from [Transloadit](https://transloadit.com)
- `NEXT_PUBLIC_CANDIDATE_LINKEDIN` — candidate's LinkedIn URL

### 3. Database

```bash
npm run db:push
```

### 4. Run (two terminals)

```bash
# Terminal 1 — Next.js
npm run dev

# Terminal 2 — Trigger.dev worker (required for Crop/Gemini/Image/Video nodes)
npm run trigger:dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, create a workflow.

> **Note:** Image and video generation models (`gemini-2.5-flash-image`, Veo) require a billing-enabled Google AI key. On a free-tier key those nodes surface a clear quota error; text Gemini works on the free tier.

## Architecture

```
src/
├── app/
│   ├── api/workflows/          # CRUD + execute + runs endpoints
│   ├── dashboard/               # Workflow list
│   └── workflow/[id]/           # Canvas page
├── components/
│   ├── Sidebar.tsx              # App navigation + workflow list
│   └── workflow/
│       ├── WorkflowCanvas.tsx   # React Flow canvas, drop-anywhere connect
│       ├── nodes/               # 6 node components
│       └── edges/               # Animated edge
├── lib/
│   ├── execution/engine.ts      # Topological execution, Trigger.dev orchestration
│   ├── graph-utils.ts           # Type checks, cycle detection, handle matching
│   └── types.ts                 # Node/graph types
├── stores/workflow-store.ts     # Zustand store (nodes, edges, history, undo/redo)
└── trigger/                     # Background tasks (crop, gemini, image-gen, video-gen)
```

### Execution flow

1. `POST /api/workflows/:id/execute` with `{ nodeIds?, scope }`
2. Target set resolved (single node, selection + upstream, or all nodes); for partial runs, outputs of non-executed upstream nodes are seeded from the saved graph
3. Nodes execute layer-by-layer (topological sort), siblings in parallel
4. Heavy nodes trigger Trigger.dev tasks and poll for completion
5. Each node run is persisted (`WorkflowRun` → `NodeRun`) and results stream back into the canvas

## Candidate

LinkedIn: [linkedin.com/in/rajan-yadavv](https://www.linkedin.com/in/rajan-yadavv/) — also logged to the browser console on every page.
