import type { InsuranceDesignAdapter } from "./types";
import type { InsuranceDesignState } from "../insuranceDesignSlice";

/* ── Node positions ─────────────────────────────────── */
/* Trigger chain (top-left, horizontal) */
const POS = {
  client: { x: 80, y: 65 },
  graphql: { x: 260, y: 65 },
  /* EventBridge internal (vertical) */
  "eb-bus": { x: 500, y: 65 },
  "eb-rules": { x: 500, y: 145 },
  "eb-target": { x: 500, y: 225 },
  /* Step Functions internal states (vertical) */
  "sfn-cache": { x: 760, y: 235 },
  "sfn-embed": { x: 760, y: 340 },
  "sfn-semantic": { x: 760, y: 440 },
  "sfn-route": { x: 760, y: 540 },
  "sfn-inference": { x: 760, y: 640 },
  "sfn-persist": { x: 760, y: 730 },
  "sfn-trace": { x: 760, y: 820 },
  /* External services (right column) */
  "ext-redis": { x: 1180, y: 235 },
  "ext-embed": { x: 1180, y: 340 },
  "ext-pgvector": { x: 1180, y: 440 },
  "ext-openai": { x: 1180, y: 640 },
  "ext-cloudwatch": { x: 1180, y: 820 },
};

export const aiLlmPlatformAltAdapter: InsuranceDesignAdapter = {
  id: "ai-llm-platform-alt",

  profile: {
    label: "Scalable LLM System",
    description:
      "A scalable, cost-effective LLM system using GraphQL gateway, EventBridge + Step Functions orchestration, Aurora pgvector for RAG, multi-layer caching (exact + semantic), and intelligent model routing across GPT-5.4 / GPT-5 / GPT-4.1 family.\n\nDesigned for high-throughput, low-latency AI applications with enterprise-grade observability via CloudWatch + X-Ray.",
  },

  colors: { fill: "#1e3a5f", stroke: "#38bdf8" },

  canvasSize: { width: 1400, height: 910 },

  /* ── Phase → state mapping ─────────────────────────── */
  computeMetrics(state: InsuranceDesignState) {
    const p = state.phase;
    const after = (phases: string[]) => phases.includes(p);

    state.dataIngested = after([
      "alt-gql-publish",
      "alt-eb-rules",
      "alt-eb-target",
      "alt-sfn-start",
      "alt-exact-cache",
      "alt-embed",
      "alt-semantic-cache",
      "alt-model-route",
      "alt-inference",
      "alt-persist",
      "alt-observe",
      "alt-respond",
      "summary",
    ]);
    state.wsConnected = after([
      "alt-eb-rules",
      "alt-eb-target",
      "alt-sfn-start",
      "alt-exact-cache",
      "alt-embed",
      "alt-semantic-cache",
      "alt-model-route",
      "alt-inference",
      "alt-persist",
      "alt-observe",
      "alt-respond",
      "summary",
    ]);
    state.orchestratorActive = after([
      "alt-sfn-start",
      "alt-exact-cache",
      "alt-embed",
      "alt-semantic-cache",
      "alt-model-route",
      "alt-inference",
      "alt-persist",
      "alt-observe",
      "alt-respond",
      "summary",
    ]);
    state.cacheChecked = after([
      "alt-exact-cache",
      "alt-embed",
      "alt-semantic-cache",
      "alt-model-route",
      "alt-inference",
      "alt-persist",
      "alt-observe",
      "alt-respond",
      "summary",
    ]);
    state.embedded = after([
      "alt-embed",
      "alt-semantic-cache",
      "alt-model-route",
      "alt-inference",
      "alt-persist",
      "alt-observe",
      "alt-respond",
      "summary",
    ]);
    state.aiProcessing = p === "alt-inference";
    state.aiComplete = after([
      "alt-persist",
      "alt-observe",
      "alt-respond",
      "summary",
    ]);
    state.resultStored = after([
      "alt-persist",
      "alt-observe",
      "alt-respond",
      "summary",
    ]);
    state.notificationSent = after(["alt-observe", "alt-respond", "summary"]);
    state.responseStreamed = after(["alt-respond", "summary"]);
  },

  expandToken(token: string): string[] | null {
    if (token === "$AI_STEP") return ["sfn-route", "sfn-embed", "ext-openai"];
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "sfn-route",
        to: "ext-openai",
        duration: 800,
        color: "#38bdf8",
        explain: "Model router selects optimal GPT model and sends request.",
      },
    ];
  },

  /* ── Scene topology ────────────────────────────────── */
  buildTopology(builder: any, state: InsuranceDesignState, helpers) {
    const hot = helpers.hot;

    // ── Next.js App ─────────────────────────────────────
    builder
      .node("client")
      .at(POS.client.x, POS.client.y)
      .rect(140, 50, 10)
      .fill(hot("client") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client") ? "#38bdf8" : "#334155", 2)
      .label("Next.js App", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Next.js App",
        sections: [
          { label: "Role", value: "Customer-facing React + @apollo/client" },
          { label: "Protocol", value: "GraphQL mutation via HTTPS" },
        ],
      });
    builder
      .node("client")
      .label("React + @apollo/client", { fill: "#7dd3fc", fontSize: 8, dy: 8 });

    // ── GraphQL Gateway ─────────────────────────────────
    builder
      .node("graphql")
      .at(POS.graphql.x, POS.graphql.y)
      .rect(150, 50, 10)
      .fill(
        state.dataIngested ? "#064e3b" : hot("graphql") ? "#1e3a5f" : "#0f172a",
      )
      .stroke(
        state.dataIngested ? "#22c55e" : hot("graphql") ? "#38bdf8" : "#334155",
        2,
      )
      .label("GraphQL Gateway", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "GraphQL Gateway",
        sections: [
          { label: "Runtime", value: "ECS · Node.js/TS" },
          { label: "Pattern", value: "Single gateway, unified schema" },
        ],
      });
    builder
      .node("graphql")
      .label(state.dataIngested ? "✓ Query received" : "ECS · Node.js/TS", {
        fill: state.dataIngested ? "#86efac" : "#7dd3fc",
        fontSize: 8,
        dy: 8,
      });

    // ── EventBridge boundary ────────────────────────────
    const ebHot = hot("eb-bus") || hot("eb-rules") || hot("eb-target");

    builder.overlay((o) => {
      o.add(
        "rect",
        {
          x: 415,
          y: 20,
          w: 170,
          h: 265,
          rx: 14,
          ry: 14,
          fill: ebHot ? "rgba(107, 33, 168, 0.06)" : "rgba(15, 23, 42, 0.0)",
          stroke: ebHot ? "#7c3aed" : "#4c1d95",
          strokeWidth: 1.4,
          strokeDasharray: "6 4",
          opacity: 0.7,
        },
        { key: "eb-boundary" },
      );
      o.add(
        "text",
        {
          x: 427,
          y: 13,
          text: "Amazon EventBridge",
          fill: "#c4b5fd",
          fontSize: 10,
          fontWeight: 700,
        },
        { key: "eb-boundary-label" },
      );
    });

    // Event Bus
    builder
      .node("eb-bus")
      .at(POS["eb-bus"].x, POS["eb-bus"].y)
      .rect(110, 40, 8)
      .fill(hot("eb-bus") ? "#3b0764" : "#0f172a")
      .stroke(hot("eb-bus") ? "#a855f7" : "#7c3aed", 1.6)
      .label("Event Bus", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Event Bus",
        sections: [
          { label: "Role", value: "Receives events via PutEvents API" },
          { label: "Type", value: "Routing ingress — not a queue" },
        ],
      });
    builder
      .node("eb-bus")
      .label("ingestion", { fill: "#d8b4fe", fontSize: 7, dy: 8 });

    // Rule Engine
    builder
      .node("eb-rules")
      .at(POS["eb-rules"].x, POS["eb-rules"].y)
      .rect(110, 40, 8)
      .fill(hot("eb-rules") ? "#3b0764" : "#0f172a")
      .stroke(hot("eb-rules") ? "#8b5cf6" : "#6d28d9", 1.6)
      .label("Rule Engine", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Rule Engine",
        sections: [
          { label: "Role", value: "Matches events to rules by pattern" },
          { label: "Power", value: "One event → N targets (fan-out)" },
        ],
      });
    builder
      .node("eb-rules")
      .label("pattern match", { fill: "#c4b5fd", fontSize: 7, dy: 8 });

    // Target: SFN
    builder
      .node("eb-target")
      .at(POS["eb-target"].x, POS["eb-target"].y)
      .rect(110, 40, 8)
      .fill(hot("eb-target") ? "#3b0764" : "#0f172a")
      .stroke(hot("eb-target") ? "#7c3aed" : "#5b21b6", 1.6)
      .label("Target: SFN", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Target → Step Functions",
        sections: [
          {
            label: "Action",
            value: "Calls StartExecution on Express workflow",
          },
          { label: "Input", value: "event.detail → workflow input" },
        ],
      });
    builder
      .node("eb-target")
      .label("StartExecution", { fill: "#a78bfa", fontSize: 7, dy: 8 });

    // ── Step Functions boundary ──────────────────────────
    builder.overlay((o) => {
      o.add(
        "rect",
        {
          x: 630,
          y: 195,
          w: 440,
          h: 680,
          rx: 18,
          ry: 18,
          fill: "rgba(15, 23, 42, 0.0)",
          stroke: "#475569",
          strokeWidth: 1.4,
          strokeDasharray: "8 5",
          opacity: 0.7,
        },
        { key: "sfn-boundary" },
      );
      o.add(
        "text",
        {
          x: 642,
          y: 188,
          text: "Step Functions — Express Workflow",
          fill: "#c4b5fd",
          fontSize: 11,
          fontWeight: 700,
        },
        { key: "sfn-boundary-label" },
      );
    });

    // ── Check Exact Cache ───────────────────────────────
    builder
      .node("sfn-cache")
      .at(POS["sfn-cache"].x, POS["sfn-cache"].y)
      .rect(190, 50, 10)
      .fill(hot("sfn-cache") ? "#78350f" : "#0f172a")
      .stroke(hot("sfn-cache") ? "#f59e0b" : "#92400e", 2)
      .label("Check Exact Cache", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Check Exact Cache",
        sections: [
          { label: "Type", value: "Task State → Redis GET" },
          { label: "Logic", value: "Hash prompt → O(1) lookup in ElastiCache" },
        ],
      });
    builder.node("sfn-cache").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#d97706",
      fontSize: 8,
    });
    builder
      .node("sfn-cache")
      .label("hash → Redis", { fill: "#fde68a", fontSize: 8, dy: 8 });

    // ── Generate Embedding ──────────────────────────────
    builder
      .node("sfn-embed")
      .at(POS["sfn-embed"].x, POS["sfn-embed"].y)
      .rect(190, 50, 10)
      .fill(hot("sfn-embed") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("sfn-embed") ? "#38bdf8" : "#1e40af", 2)
      .label("Generate Embedding", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Generate Embedding",
        sections: [
          { label: "Type", value: "Task State → Embedding Service" },
          { label: "Model", value: "SentenceTransformer (5–20 ms)" },
        ],
      });
    builder.node("sfn-embed").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#2563eb",
      fontSize: 8,
    });
    builder.node("sfn-embed").label("SentenceTransformer", {
      fill: "#93c5fd",
      fontSize: 8,
      dy: 8,
    });

    // ── Semantic Search ─────────────────────────────────
    builder
      .node("sfn-semantic")
      .at(POS["sfn-semantic"].x, POS["sfn-semantic"].y)
      .rect(190, 50, 10)
      .fill(hot("sfn-semantic") ? "#713f12" : "#0f172a")
      .stroke(hot("sfn-semantic") ? "#eab308" : "#854d0e", 2)
      .label("Semantic Search", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Semantic Search",
        sections: [
          { label: "Type", value: "Task State → Aurora pgvector" },
          { label: "Logic", value: "Cosine similarity ≥ 0.90 → cache hit" },
        ],
      });
    builder.node("sfn-semantic").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#ca8a04",
      fontSize: 8,
    });
    builder
      .node("sfn-semantic")
      .label("cosine similarity", { fill: "#fde047", fontSize: 8, dy: 8 });

    // ── Route Model ─────────────────────────────────────
    builder
      .node("sfn-route")
      .at(POS["sfn-route"].x, POS["sfn-route"].y)
      .rect(190, 50, 10)
      .fill(hot("sfn-route") ? "#4c1d95" : "#0f172a")
      .stroke(hot("sfn-route") ? "#a78bfa" : "#6d28d9", 2)
      .label("Route Model", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Route Model",
        sections: [
          { label: "Type", value: "Task State — complexity classifier" },
          {
            label: "Models",
            value: "GPT-5.4 ($2.50/M) → GPT-4.1 nano ($0.10/M)",
          },
        ],
      });
    builder.node("sfn-route").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#7c3aed",
      fontSize: 8,
    });
    builder.node("sfn-route").label("complexity classifier", {
      fill: "#c4b5fd",
      fontSize: 8,
      dy: 8,
    });

    // ── LLM Inference ───────────────────────────────────
    builder
      .node("sfn-inference")
      .at(POS["sfn-inference"].x, POS["sfn-inference"].y)
      .rect(190, 50, 10)
      .fill(hot("sfn-inference") ? "#1e3a5f" : "#0f172a")
      .stroke(
        state.aiProcessing
          ? "#c084fc"
          : state.aiComplete
            ? "#22c55e"
            : hot("sfn-inference")
              ? "#3b82f6"
              : "#334155",
        2,
      )
      .label("LLM Inference", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "LLM Inference",
        sections: [
          { label: "Type", value: "Task State → OpenAI API" },
          { label: "Input", value: "Question + RAG context + session" },
        ],
      });
    builder.node("sfn-inference").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#2563eb",
      fontSize: 8,
    });
    builder
      .node("sfn-inference")
      .label(
        state.aiComplete
          ? "✓ Tokens received"
          : state.aiProcessing
            ? "⏳ reasoning…"
            : "GPT-5.4 / 5 / 4.1",
        {
          fill: state.aiComplete
            ? "#86efac"
            : state.aiProcessing
              ? "#fbbf24"
              : "#93c5fd",
          fontSize: 8,
          dy: 8,
        },
      );

    // ── Persist Results ─────────────────────────────────
    builder
      .node("sfn-persist")
      .at(POS["sfn-persist"].x, POS["sfn-persist"].y)
      .rect(190, 50, 10)
      .fill(hot("sfn-persist") ? "#713f12" : "#0f172a")
      .stroke(
        state.resultStored
          ? "#eab308"
          : hot("sfn-persist")
            ? "#f59e0b"
            : "#334155",
        2,
      )
      .label("Persist Results", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Persist Results",
        sections: [
          { label: "Type", value: "Parallel State — two branches" },
          { label: "Branch 1", value: "Aurora pgvector — embedding + answer" },
          { label: "Branch 2", value: "Redis — exact-match cache entry" },
        ],
      });
    builder.node("sfn-persist").badge("Parallel", {
      position: "top-right",
      fill: "#fff",
      background: "#ca8a04",
      fontSize: 8,
    });
    builder
      .node("sfn-persist")
      .label(state.resultStored ? "✓ Persisted" : "pgvector + Redis", {
        fill: state.resultStored ? "#fde047" : "#94a3b8",
        fontSize: 8,
        dy: 8,
      });

    // ── Record Trace ────────────────────────────────────
    builder
      .node("sfn-trace")
      .at(POS["sfn-trace"].x, POS["sfn-trace"].y)
      .rect(190, 50, 10)
      .fill(hot("sfn-trace") ? "#064e3b" : "#0f172a")
      .stroke(
        state.notificationSent
          ? "#22c55e"
          : hot("sfn-trace")
            ? "#22c55e"
            : "#334155",
        2,
      )
      .label("Record Trace", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Record Trace",
        sections: [
          { label: "Type", value: "Task State → CloudWatch + X-Ray" },
          { label: "Tracks", value: "Tokens, latency, cost, model selection" },
        ],
      });
    builder.node("sfn-trace").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#16a34a",
      fontSize: 8,
    });
    builder
      .node("sfn-trace")
      .label(state.notificationSent ? "✓ Trace recorded" : "X-Ray spans", {
        fill: state.notificationSent ? "#86efac" : "#94a3b8",
        fontSize: 8,
        dy: 8,
      });

    // ── External Services (right column) ────────────────

    // ElastiCache (Redis)
    builder
      .node("ext-redis")
      .at(POS["ext-redis"].x, POS["ext-redis"].y)
      .rect(140, 48, 10)
      .fill(hot("ext-redis") ? "#78350f" : "#0f172a")
      .stroke(
        state.cacheChecked
          ? "#f59e0b"
          : hot("ext-redis")
            ? "#f59e0b"
            : "#334155",
        1.6,
      )
      .label("ElastiCache", {
        fill: "#fde68a",
        fontSize: 11,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "ElastiCache (Redis)",
        sections: [
          { label: "Role", value: "Exact-match cache + session store" },
          { label: "Lookup", value: "O(1) hash GET, sub-millisecond" },
        ],
      });
    builder.node("ext-redis").label("Exact-match cache", {
      fill: "#fef3c7",
      fontSize: 8,
      dy: 8,
    });

    // Embedding Service
    builder
      .node("ext-embed")
      .at(POS["ext-embed"].x, POS["ext-embed"].y)
      .rect(140, 48, 10)
      .fill(hot("ext-embed") ? "#1e3a5f" : "#0f172a")
      .stroke(
        state.embedded ? "#38bdf8" : hot("ext-embed") ? "#38bdf8" : "#334155",
        1.6,
      )
      .label("Embedding Svc", {
        fill: "#93c5fd",
        fontSize: 11,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Embedding Service",
        sections: [
          { label: "Model", value: "SentenceTransformer (on-prem)" },
          { label: "Latency", value: "5–20 ms per call" },
        ],
      });
    builder.node("ext-embed").label("SentenceTransformer", {
      fill: "#bfdbfe",
      fontSize: 8,
      dy: 8,
    });

    // Aurora pgvector
    builder
      .node("ext-pgvector")
      .at(POS["ext-pgvector"].x, POS["ext-pgvector"].y)
      .rect(140, 48, 10)
      .fill(hot("ext-pgvector") ? "#713f12" : "#0f172a")
      .stroke(
        state.resultStored
          ? "#eab308"
          : hot("ext-pgvector")
            ? "#f59e0b"
            : "#334155",
        1.6,
      )
      .label("Aurora pgvector", {
        fill: "#fde047",
        fontSize: 11,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Aurora pgvector",
        sections: [
          { label: "Role", value: "Vector similarity DB + relational store" },
          { label: "Benefit", value: "ACID, multi-AZ, no extra infra" },
        ],
      });
    builder.node("ext-pgvector").label("Vector similarity DB", {
      fill: "#fef9c3",
      fontSize: 8,
      dy: 8,
    });

    // OpenAI API
    builder
      .node("ext-openai")
      .at(POS["ext-openai"].x, POS["ext-openai"].y)
      .rect(140, 48, 10)
      .fill(
        state.aiComplete
          ? "#064e3b"
          : hot("ext-openai")
            ? "#1e3a5f"
            : "#0f172a",
      )
      .stroke(
        state.aiComplete
          ? "#22c55e"
          : hot("ext-openai")
            ? "#3b82f6"
            : "#334155",
        1.6,
      )
      .label("OpenAI API", {
        fill: "#93c5fd",
        fontSize: 11,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "OpenAI API",
        sections: [
          { label: "Models", value: "GPT-5.4 / GPT-5 / GPT-4.1 family" },
          { label: "Routing", value: "Cheapest model that can handle it" },
        ],
      });
    builder
      .node("ext-openai")
      .label(
        state.aiComplete ? "✓ Tokens received" : "GPT-5.4 / 5 / 4.1 family",
        {
          fill: state.aiComplete ? "#86efac" : "#bfdbfe",
          fontSize: 8,
          dy: 8,
        },
      );

    // CloudWatch + X-Ray
    builder
      .node("ext-cloudwatch")
      .at(POS["ext-cloudwatch"].x, POS["ext-cloudwatch"].y)
      .rect(140, 48, 10)
      .fill(hot("ext-cloudwatch") ? "#064e3b" : "#0f172a")
      .stroke(
        state.notificationSent
          ? "#22c55e"
          : hot("ext-cloudwatch")
            ? "#22c55e"
            : "#334155",
        1.6,
      )
      .label("CloudWatch", {
        fill: "#86efac",
        fontSize: 11,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "CloudWatch + X-Ray",
        sections: [
          { label: "Role", value: "Distributed tracing + metrics" },
          { label: "Tracks", value: "Token usage, latency, cost per request" },
        ],
      });
    builder.node("ext-cloudwatch").label("Distributed tracing", {
      fill: "#bbf7d0",
      fontSize: 8,
      dy: 8,
    });

    // ═══════════════════════════════════════════════════
    // EDGES — Trigger Chain
    // ═══════════════════════════════════════════════════

    // Client → GraphQL
    builder
      .edge("client", "graphql", "e-client-gql")
      .arrow(true)
      .stroke(
        hot("client") && hot("graphql") ? "#38bdf8" : "#334155",
        hot("client") && hot("graphql") ? 2.4 : 1.2,
      )
      .label("GraphQL (HTTPS)", { fill: "#7dd3fc", fontSize: 8 });

    // GraphQL → Event Bus
    builder
      .edge("graphql", "eb-bus", "e-gql-bus")
      .arrow(true)
      .stroke(
        hot("graphql") && hot("eb-bus") ? "#a855f7" : "#334155",
        hot("graphql") && hot("eb-bus") ? 2.4 : 1.2,
      )
      .label("PutEvents", { fill: "#c4b5fd", fontSize: 8 });

    // ═══════════════════════════════════════════════════
    // EDGES — EventBridge Internal
    // ═══════════════════════════════════════════════════

    builder
      .edge("eb-bus", "eb-rules", "e-bus-rules")
      .arrow(true)
      .stroke(
        hot("eb-bus") && hot("eb-rules") ? "#a855f7" : "#4c1d95",
        hot("eb-bus") && hot("eb-rules") ? 1.8 : 1,
      )
      .label("matches", { fill: "#c4b5fd", fontSize: 7 });

    builder
      .edge("eb-rules", "eb-target", "e-rules-target")
      .arrow(true)
      .stroke(
        hot("eb-rules") && hot("eb-target") ? "#8b5cf6" : "#4c1d95",
        hot("eb-rules") && hot("eb-target") ? 1.8 : 1,
      )
      .label("routes", { fill: "#c4b5fd", fontSize: 7 });

    // Target → Check Exact Cache (enters workflow)
    builder
      .edge("eb-target", "sfn-cache", "e-target-cache")
      .arrow(true)
      .stroke(
        hot("eb-target") && hot("sfn-cache") ? "#7c3aed" : "#334155",
        hot("eb-target") && hot("sfn-cache") ? 2.4 : 1.2,
      )
      .label("StartExecution", { fill: "#a78bfa", fontSize: 7 });

    // ═══════════════════════════════════════════════════
    // EDGES — Step Functions Internal (vertical chain)
    // ═══════════════════════════════════════════════════

    builder
      .edge("sfn-cache", "sfn-embed", "e-cache-embed")
      .arrow(true)
      .stroke(
        hot("sfn-cache") && hot("sfn-embed") ? "#818cf8" : "#334155",
        hot("sfn-cache") && hot("sfn-embed") ? 2.2 : 1.2,
      )
      .label(state.cacheChecked ? "miss" : "", {
        fill: "#fca5a5",
        fontSize: 8,
      });

    builder
      .edge("sfn-embed", "sfn-semantic", "e-embed-semantic")
      .arrow(true)
      .stroke(
        hot("sfn-embed") && hot("sfn-semantic") ? "#818cf8" : "#334155",
        hot("sfn-embed") && hot("sfn-semantic") ? 2.2 : 1.2,
      );

    builder
      .edge("sfn-semantic", "sfn-route", "e-semantic-route")
      .arrow(true)
      .stroke(
        hot("sfn-semantic") && hot("sfn-route") ? "#818cf8" : "#334155",
        hot("sfn-semantic") && hot("sfn-route") ? 2.2 : 1.2,
      )
      .label(state.embedded ? "miss" : "", {
        fill: "#fca5a5",
        fontSize: 8,
      });

    builder
      .edge("sfn-route", "sfn-inference", "e-route-inference")
      .arrow(true)
      .stroke(
        hot("sfn-route") && hot("sfn-inference") ? "#818cf8" : "#334155",
        hot("sfn-route") && hot("sfn-inference") ? 2.2 : 1.2,
      );

    builder
      .edge("sfn-inference", "sfn-persist", "e-inference-persist")
      .arrow(true)
      .stroke(
        hot("sfn-inference") && hot("sfn-persist") ? "#818cf8" : "#334155",
        hot("sfn-inference") && hot("sfn-persist") ? 2.2 : 1.2,
      );

    builder
      .edge("sfn-persist", "sfn-trace", "e-persist-trace")
      .arrow(true)
      .stroke(
        hot("sfn-persist") && hot("sfn-trace") ? "#818cf8" : "#334155",
        hot("sfn-persist") && hot("sfn-trace") ? 2.2 : 1.2,
      );

    // ═══════════════════════════════════════════════════
    // EDGES — Service Calls (dashed — to external services)
    // ═══════════════════════════════════════════════════

    // Check Cache → Redis
    builder
      .edge("sfn-cache", "ext-redis", "e-cache-redis")
      .arrow(true)
      .stroke(
        hot("sfn-cache") && hot("ext-redis") ? "#f59e0b" : "#262626",
        hot("sfn-cache") && hot("ext-redis") ? 1.6 : 0.8,
      )
      .dashed()
      .label("GET hash", { fill: "#fde68a", fontSize: 7 });

    // Generate Embedding → Embedding Service
    builder
      .edge("sfn-embed", "ext-embed", "e-embed-svc")
      .arrow(true)
      .stroke(
        hot("sfn-embed") && hot("ext-embed") ? "#38bdf8" : "#262626",
        hot("sfn-embed") && hot("ext-embed") ? 1.6 : 0.8,
      )
      .dashed()
      .label("encode", { fill: "#93c5fd", fontSize: 7 });

    // Semantic Search → pgvector
    builder
      .edge("sfn-semantic", "ext-pgvector", "e-semantic-pgvector")
      .arrow(true)
      .stroke(
        hot("sfn-semantic") && hot("ext-pgvector") ? "#eab308" : "#262626",
        hot("sfn-semantic") && hot("ext-pgvector") ? 1.6 : 0.8,
      )
      .dashed()
      .label("cosine search", { fill: "#fde047", fontSize: 7 });

    // LLM Inference → OpenAI
    builder
      .edge("sfn-inference", "ext-openai", "e-inference-openai")
      .arrow(true)
      .stroke(
        hot("sfn-inference") && hot("ext-openai") ? "#3b82f6" : "#262626",
        hot("sfn-inference") && hot("ext-openai") ? 1.6 : 0.8,
      )
      .dashed()
      .label("HTTPS (REST)", { fill: "#93c5fd", fontSize: 7 });

    // Persist → pgvector
    builder
      .edge("sfn-persist", "ext-pgvector", "e-persist-pgvector")
      .arrow(true)
      .stroke(
        state.resultStored ? "#eab308" : "#262626",
        state.resultStored ? 1.2 : 0.8,
      )
      .dashed()
      .label("store embedding", { fill: "#fde047", fontSize: 7 });

    // Persist → Redis
    builder
      .edge("sfn-persist", "ext-redis", "e-persist-redis")
      .arrow(true)
      .stroke(
        state.resultStored ? "#f59e0b" : "#262626",
        state.resultStored ? 1.2 : 0.8,
      )
      .dashed()
      .label("cache response", { fill: "#fde68a", fontSize: 7 });

    // Record Trace → CloudWatch
    builder
      .edge("sfn-trace", "ext-cloudwatch", "e-trace-cloudwatch")
      .arrow(true)
      .stroke(
        hot("sfn-trace") && hot("ext-cloudwatch") ? "#22c55e" : "#262626",
        hot("sfn-trace") && hot("ext-cloudwatch") ? 1.6 : 0.8,
      )
      .dashed()
      .label("metrics + traces", { fill: "#86efac", fontSize: 7 });

    // ═══════════════════════════════════════════════════
    // EDGE — Response path (dashed)
    // ═══════════════════════════════════════════════════

    builder
      .edge("graphql", "client", "e-gql-respond")
      .arrow(true)
      .stroke(state.responseStreamed ? "#38bdf8" : "#475569", 2)
      .dashed()
      .label(
        state.responseStreamed ? "GraphQL ← response" : "GraphQL (response)",
        {
          fill: state.responseStreamed ? "#7dd3fc" : "#94a3b8",
          fontSize: 9,
        },
      );
  },

  getStatBadges(state: InsuranceDesignState) {
    return [
      { label: "Variant", value: "Scalable LLM", color: "#38bdf8" },
      {
        label: "API",
        value: state.dataIngested ? "GraphQL ✓" : "GraphQL",
        color: state.dataIngested ? "#22c55e" : "#94a3b8",
      },
      {
        label: "Orchestrator",
        value: state.orchestratorActive ? "Step Fn ✓" : "Step Functions",
        color: state.orchestratorActive ? "#a78bfa" : "#94a3b8",
      },
      {
        label: "Cache",
        value: state.resultStored
          ? "Multi-layer ✓"
          : state.cacheChecked
            ? "Miss"
            : "Exact + Semantic",
        color: state.resultStored
          ? "#f59e0b"
          : state.cacheChecked
            ? "#fca5a5"
            : "#94a3b8",
      },
      {
        label: "LLM",
        value: state.aiComplete ? "GPT-4.1 ✓" : "Multi-model",
        color: state.aiComplete ? "#22c55e" : "#94a3b8",
      },
    ];
  },

  softReset(state: InsuranceDesignState) {
    state.dataIngested = false;
    state.orchestratorActive = false;
    state.wsConnected = false;
    state.cacheChecked = false;
    state.embedded = false;
    state.aiProcessing = false;
    state.aiComplete = false;
    state.resultStored = false;
    state.notificationSent = false;
    state.responseStreamed = false;
  },
};
