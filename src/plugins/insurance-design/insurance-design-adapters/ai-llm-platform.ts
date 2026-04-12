import type { InsuranceDesignAdapter } from "./types";
import type { InsuranceDesignState } from "../insuranceDesignSlice";

/* ── Node positions ─────────────────────────────────── */
const POS = {
  /* Trigger chain (top, horizontal) */
  client: { x: 100, y: 70 },
  wsapi: { x: 280, y: 70 },
  gateway: { x: 460, y: 70 },
  /* SQS internal (vertical, below gateway) */
  "sqs-send": { x: 640, y: 180 },
  "sqs-buffer": { x: 640, y: 260 },
  "sqs-poll": { x: 640, y: 340 },
  /* ECS Fargate / LangGraph internal (vertical, right & below SQS) */
  "ecs-consume": { x: 840, y: 430 },
  "ecs-embed": { x: 840, y: 505 },
  "ecs-cache": { x: 840, y: 580 },
  "ecs-infer": { x: 840, y: 655 },
  "ecs-persist": { x: 840, y: 730 },
  "ecs-trace": { x: 840, y: 805 },
  "ecs-reply": { x: 840, y: 880 },
  /* External services (right column, aligned with ECS stages) */
  "ext-bedrock": { x: 1200, y: 505 },
  "ext-redis": { x: 1200, y: 580 },
  "ext-openai": { x: 1200, y: 655 },
  "ext-aurora": { x: 1200, y: 730 },
  "ext-langfuse": { x: 1200, y: 805 },
};

export const aiLlmPlatformAdapter: InsuranceDesignAdapter = {
  id: "ai-llm-platform",

  profile: {
    label: "LLM Platform",
    description:
      "A scalable LLM platform for customer-facing AI — policy Q&A, quote guidance, and claims help.\n\nUses WebSocket for real-time streaming, SQS for rate-limit protection, LangGraph on ECS Fargate for multi-step agent reasoning, Redis for semantic caching, and Langfuse for LLM observability.",
  },

  colors: { fill: "#4c1d95", stroke: "#a78bfa" },

  canvasSize: { width: 1400, height: 940 },

  /* ── Phase → state mapping ─────────────────────────── */
  computeMetrics(state: InsuranceDesignState) {
    const p = state.phase;
    const after = (phases: string[]) => phases.includes(p);

    const AFTER_WS = [
      "ws-connect",
      "message",
      "sqs-send",
      "sqs-buffer",
      "sqs-poll",
      "ecs-consume",
      "ecs-embed",
      "ecs-cache",
      "ecs-infer",
      "ecs-persist-db",
      "ecs-persist-cache",
      "ecs-trace",
      "ecs-reply",
      "stream",
      "summary",
    ];
    const AFTER_MSG = AFTER_WS.slice(1);
    const AFTER_SQS = AFTER_MSG.slice(1);
    const AFTER_EMBED = [
      "ecs-embed",
      "ecs-cache",
      "ecs-infer",
      "ecs-persist-db",
      "ecs-persist-cache",
      "ecs-trace",
      "ecs-reply",
      "stream",
      "summary",
    ];
    const AFTER_CACHE = AFTER_EMBED.slice(1);
    const AFTER_AI = [
      "ecs-persist-db",
      "ecs-persist-cache",
      "ecs-trace",
      "ecs-reply",
      "stream",
      "summary",
    ];
    const AFTER_TRACE = ["ecs-trace", "ecs-reply", "stream", "summary"];

    state.wsConnected = after(AFTER_WS);
    state.dataIngested = after(AFTER_MSG);
    state.orchestratorActive = after(AFTER_SQS);
    state.embedded = after(AFTER_EMBED);
    state.cacheChecked = after(AFTER_CACHE);
    state.aiProcessing = p === "ecs-infer";
    state.aiComplete = after(AFTER_AI);
    state.resultStored = after(AFTER_AI);
    state.notificationSent = after(AFTER_TRACE);
    state.responseStreamed = after(["stream", "summary"]);
  },

  expandToken(token: string): string[] | null {
    if (token === "$AI_STEP") return ["ecs-infer", "ecs-embed", "ext-openai"];
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "ecs-infer",
        to: "ext-openai",
        duration: 800,
        color: "#a78bfa",
        explain: "LangGraph agent calls OpenAI GPT-4o via HTTPS.",
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
      .fill(hot("client") ? "#4c1d95" : "#0f172a")
      .stroke(hot("client") ? "#a78bfa" : "#334155", 2)
      .label("Next.js App", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Next.js App",
        sections: [
          { label: "Role", value: "Customer-facing React chat widget" },
          { label: "Protocol", value: "WebSocket (WSS) to API Gateway" },
        ],
      });
    builder
      .node("client")
      .label("React chat widget", { fill: "#c4b5fd", fontSize: 8, dy: 8 });

    // ── API GW WebSocket ────────────────────────────────
    builder
      .node("wsapi")
      .at(POS.wsapi.x, POS.wsapi.y)
      .rect(148, 50, 10)
      .fill(
        state.wsConnected ? "#064e3b" : hot("wsapi") ? "#134e4a" : "#0f172a",
      )
      .stroke(
        state.wsConnected ? "#22c55e" : hot("wsapi") ? "#14b8a6" : "#334155",
        2,
      )
      .label("API GW WebSocket", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "API Gateway WebSocket",
        sections: [
          { label: "Role", value: "Persistent two-way connection" },
          { label: "Routes", value: "$connect · $default · $disconnect" },
          { label: "Key", value: "connectionId assigned per socket" },
        ],
      });
    builder
      .node("wsapi")
      .label(state.wsConnected ? "✓ WSS connected" : "$connect / $default", {
        fill: state.wsConnected ? "#86efac" : "#5eead4",
        fontSize: 8,
        dy: 8,
      });

    // ── Lambda ──────────────────────────────────────────
    builder
      .node("gateway")
      .at(POS.gateway.x, POS.gateway.y)
      .rect(140, 50, 10)
      .fill(hot("gateway") ? "#312e81" : "#0f172a")
      .stroke(hot("gateway") ? "#818cf8" : "#334155", 2)
      .label("Lambda", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Lambda — Route Handler",
        sections: [
          {
            label: "Role",
            value: "Validates message, maps connectionId → user",
          },
          { label: "Output", value: "Enqueues message to SQS" },
        ],
      });
    builder
      .node("gateway")
      .label(state.dataIngested ? "✓ Message accepted" : "Route handler", {
        fill: state.dataIngested ? "#86efac" : "#c4b5fd",
        fontSize: 8,
        dy: 8,
      });

    // ── SQS boundary ────────────────────────────────────
    const sqsHot = hot("sqs-send") || hot("sqs-buffer") || hot("sqs-poll");

    builder.overlay((o) => {
      o.add(
        "rect",
        {
          x: 575,
          y: 138,
          w: 130,
          h: 250,
          rx: 14,
          ry: 14,
          fill: sqsHot ? "rgba(153, 27, 27, 0.06)" : "rgba(15, 23, 42, 0.0)",
          stroke: sqsHot ? "#ef4444" : "#7f1d1d",
          strokeWidth: 1.4,
          strokeDasharray: "6 4",
          opacity: 0.7,
        },
        { key: "sqs-boundary" },
      );
      o.add(
        "text",
        {
          x: 587,
          y: 131,
          text: "Amazon SQS",
          fill: "#fca5a5",
          fontSize: 10,
          fontWeight: 700,
        },
        { key: "sqs-boundary-label" },
      );
    });

    // SendMessage
    builder
      .node("sqs-send")
      .at(POS["sqs-send"].x, POS["sqs-send"].y)
      .rect(110, 40, 8)
      .fill(hot("sqs-send") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("sqs-send") ? "#ef4444" : "#991b1b", 1.6)
      .label("SendMessage", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "SendMessage API",
        sections: [
          { label: "Role", value: "Lambda calls sqs.sendMessage()" },
          { label: "Payload", value: "question + connectionId + userId" },
        ],
      });
    builder
      .node("sqs-send")
      .label("API call", { fill: "#fca5a5", fontSize: 7, dy: 8 });

    // Queue Storage
    builder
      .node("sqs-buffer")
      .at(POS["sqs-buffer"].x, POS["sqs-buffer"].y)
      .rect(110, 40, 8)
      .fill(hot("sqs-buffer") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("sqs-buffer") ? "#f87171" : "#991b1b", 1.6)
      .label("Queue Storage", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Queue Storage",
        sections: [
          {
            label: "Role",
            value: "Messages wait here until a worker picks them up",
          },
          {
            label: "Visibility",
            value: "30 s timeout — prevents double-processing",
          },
          {
            label: "DLQ",
            value: "Failed messages → dead-letter queue after 3 retries",
          },
        ],
      });
    builder
      .node("sqs-buffer")
      .label("rate-limit buffer", { fill: "#fca5a5", fontSize: 7, dy: 8 });

    // Long Poll
    builder
      .node("sqs-poll")
      .at(POS["sqs-poll"].x, POS["sqs-poll"].y)
      .rect(110, 40, 8)
      .fill(hot("sqs-poll") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("sqs-poll") ? "#ef4444" : "#991b1b", 1.6)
      .label("Long Poll", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Long Poll — ReceiveMessage",
        sections: [
          {
            label: "Role",
            value: "ECS worker calls receiveMessage(WaitTimeSeconds: 20)",
          },
          {
            label: "Pattern",
            value: "Long poll — waits up to 20 s for a message",
          },
          { label: "Benefit", value: "No empty polls, no wasted API calls" },
        ],
      });
    builder
      .node("sqs-poll")
      .label("ReceiveMessage", { fill: "#fca5a5", fontSize: 7, dy: 8 });

    // ── ECS Fargate / LangGraph boundary ────────────────
    const ecsHot =
      hot("ecs-consume") ||
      hot("ecs-embed") ||
      hot("ecs-cache") ||
      hot("ecs-infer") ||
      hot("ecs-persist") ||
      hot("ecs-trace") ||
      hot("ecs-reply");

    builder.overlay((o) => {
      o.add(
        "rect",
        {
          x: 720,
          y: 400,
          w: 260,
          h: 520,
          rx: 18,
          ry: 18,
          fill: "rgba(15, 23, 42, 0.0)",
          stroke: ecsHot ? "#a78bfa" : "#475569",
          strokeWidth: 1.4,
          strokeDasharray: "8 5",
          opacity: 0.7,
        },
        { key: "ecs-boundary" },
      );
      o.add(
        "text",
        {
          x: 732,
          y: 393,
          text: "ECS Fargate — LangGraph Agent",
          fill: "#c4b5fd",
          fontSize: 11,
          fontWeight: 700,
        },
        { key: "ecs-boundary-label" },
      );
    });

    // ── SQS Consumer ────────────────────────────────────
    builder
      .node("ecs-consume")
      .at(POS["ecs-consume"].x, POS["ecs-consume"].y)
      .rect(190, 50, 10)
      .fill(hot("ecs-consume") ? "#4c1d95" : "#0f172a")
      .stroke(hot("ecs-consume") ? "#a78bfa" : "#6d28d9", 2)
      .label("SQS Consumer", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "SQS Consumer",
        sections: [
          { label: "Role", value: "Pulls messages from queue via long poll" },
          { label: "Scaling", value: "Any worker can pick up any message" },
        ],
      });
    builder.node("ecs-consume").badge("Entry", {
      position: "top-right",
      fill: "#fff",
      background: "#7c3aed",
      fontSize: 8,
    });
    builder
      .node("ecs-consume")
      .label("ReceiveMessage", { fill: "#c4b5fd", fontSize: 8, dy: 8 });

    // ── Generate Embedding ──────────────────────────────
    builder
      .node("ecs-embed")
      .at(POS["ecs-embed"].x, POS["ecs-embed"].y)
      .rect(190, 50, 10)
      .fill(hot("ecs-embed") ? "#1e3a5f" : "#0f172a")
      .stroke(
        state.embedded ? "#38bdf8" : hot("ecs-embed") ? "#38bdf8" : "#334155",
        2,
      )
      .label("Generate Embedding", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Generate Embedding",
        sections: [
          { label: "Type", value: "Tool call → Bedrock Titan v2" },
          { label: "Model", value: "Titan Text Embeddings v2 (5–20 ms)" },
        ],
      });
    builder.node("ecs-embed").badge("Tool", {
      position: "top-right",
      fill: "#fff",
      background: "#2563eb",
      fontSize: 8,
    });
    builder
      .node("ecs-embed")
      .label(state.embedded ? "✓ Vector ready" : "Titan Text v2", {
        fill: state.embedded ? "#86efac" : "#93c5fd",
        fontSize: 8,
        dy: 8,
      });

    // ── Cache Lookup ────────────────────────────────────
    builder
      .node("ecs-cache")
      .at(POS["ecs-cache"].x, POS["ecs-cache"].y)
      .rect(190, 50, 10)
      .fill(hot("ecs-cache") ? "#78350f" : "#0f172a")
      .stroke(
        state.cacheChecked
          ? "#f59e0b"
          : hot("ecs-cache")
            ? "#f59e0b"
            : "#334155",
        2,
      )
      .label("Cache Lookup", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Cache Lookup — Redis Vector Search",
        sections: [
          { label: "Type", value: "Tool call → ElastiCache Redis" },
          { label: "Logic", value: "Cosine similarity ≥ 0.90 → cache hit" },
        ],
      });
    builder.node("ecs-cache").badge("Tool", {
      position: "top-right",
      fill: "#fff",
      background: "#d97706",
      fontSize: 8,
    });
    builder
      .node("ecs-cache")
      .label(
        state.resultStored
          ? "✓ Response cached"
          : state.cacheChecked
            ? "✗ Cache miss"
            : "vector similarity",
        {
          fill: state.resultStored
            ? "#fde047"
            : state.cacheChecked
              ? "#fca5a5"
              : "#fde68a",
          fontSize: 8,
          dy: 8,
        },
      );

    // ── LLM Inference ───────────────────────────────────
    builder
      .node("ecs-infer")
      .at(POS["ecs-infer"].x, POS["ecs-infer"].y)
      .rect(190, 50, 10)
      .fill(hot("ecs-infer") ? "#1e3a5f" : "#0f172a")
      .stroke(
        state.aiProcessing
          ? "#c084fc"
          : state.aiComplete
            ? "#22c55e"
            : hot("ecs-infer")
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
        title: "LLM Inference — OpenAI GPT-4o",
        sections: [
          { label: "Type", value: "Tool call → OpenAI API (HTTPS)" },
          { label: "Input", value: "Question + RAG context + session" },
          {
            label: "Output",
            value: "Structured JSON (answer, citations, confidence)",
          },
        ],
      });
    builder.node("ecs-infer").badge("Tool", {
      position: "top-right",
      fill: "#fff",
      background: "#2563eb",
      fontSize: 8,
    });
    builder
      .node("ecs-infer")
      .label(
        state.aiComplete
          ? "✓ Tokens received"
          : state.aiProcessing
            ? "⏳ GPT-4o reasoning…"
            : "GPT-4o (chat)",
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
      .node("ecs-persist")
      .at(POS["ecs-persist"].x, POS["ecs-persist"].y)
      .rect(190, 50, 10)
      .fill(hot("ecs-persist") ? "#713f12" : "#0f172a")
      .stroke(
        state.resultStored
          ? "#eab308"
          : hot("ecs-persist")
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
          { label: "Type", value: "Parallel — two branches" },
          {
            label: "Branch 1",
            value: "Aurora PostgreSQL — conversation history",
          },
          { label: "Branch 2", value: "Redis — embedding + answer cache" },
        ],
      });
    builder.node("ecs-persist").badge("Parallel", {
      position: "top-right",
      fill: "#fff",
      background: "#ca8a04",
      fontSize: 8,
    });
    builder
      .node("ecs-persist")
      .label(state.resultStored ? "✓ Persisted" : "Aurora + Redis", {
        fill: state.resultStored ? "#fde047" : "#94a3b8",
        fontSize: 8,
        dy: 8,
      });

    // ── Record Trace ────────────────────────────────────
    builder
      .node("ecs-trace")
      .at(POS["ecs-trace"].x, POS["ecs-trace"].y)
      .rect(190, 50, 10)
      .fill(hot("ecs-trace") ? "#064e3b" : "#0f172a")
      .stroke(
        state.notificationSent
          ? "#22c55e"
          : hot("ecs-trace")
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
        title: "Record Trace — Langfuse",
        sections: [
          { label: "Type", value: "Tool call → Langfuse (HTTPS)" },
          { label: "Tracks", value: "Tokens, latency, cost, model, quality" },
        ],
      });
    builder.node("ecs-trace").badge("Tool", {
      position: "top-right",
      fill: "#fff",
      background: "#16a34a",
      fontSize: 8,
    });
    builder
      .node("ecs-trace")
      .label(state.notificationSent ? "✓ Trace recorded" : "Langfuse spans", {
        fill: state.notificationSent ? "#86efac" : "#94a3b8",
        fontSize: 8,
        dy: 8,
      });

    // ── Stream Response ─────────────────────────────────
    builder
      .node("ecs-reply")
      .at(POS["ecs-reply"].x, POS["ecs-reply"].y)
      .rect(190, 50, 10)
      .fill(hot("ecs-reply") ? "#4c1d95" : "#0f172a")
      .stroke(
        state.responseStreamed
          ? "#a78bfa"
          : hot("ecs-reply")
            ? "#a78bfa"
            : "#334155",
        2,
      )
      .label("Stream Response", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Stream Response — postToConnection",
        sections: [
          { label: "Role", value: "Sends answer chunks back via API Gateway" },
          {
            label: "Address",
            value: "Uses connectionId from original message",
          },
          { label: "Pattern", value: "Word-by-word streaming, then citations" },
        ],
      });
    builder.node("ecs-reply").badge("Exit", {
      position: "top-right",
      fill: "#fff",
      background: "#7c3aed",
      fontSize: 8,
    });
    builder
      .node("ecs-reply")
      .label(state.responseStreamed ? "✓ Streamed" : "postToConnection", {
        fill: state.responseStreamed ? "#c4b5fd" : "#94a3b8",
        fontSize: 8,
        dy: 8,
      });

    // ── External Services (right column) ────────────────

    // Bedrock Embeddings
    builder
      .node("ext-bedrock")
      .at(POS["ext-bedrock"].x, POS["ext-bedrock"].y)
      .rect(140, 48, 10)
      .fill(
        state.embedded ? "#1e3a5f" : hot("ext-bedrock") ? "#1e3a5f" : "#0f172a",
      )
      .stroke(
        state.embedded ? "#38bdf8" : hot("ext-bedrock") ? "#38bdf8" : "#334155",
        1.6,
      )
      .label("Bedrock Embed", {
        fill: "#7dd3fc",
        fontSize: 11,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Bedrock Embeddings",
        sections: [
          { label: "Model", value: "Titan Text Embeddings v2" },
          {
            label: "Why",
            value: "Runs inside AWS — data never leaves network",
          },
        ],
      });
    builder.node("ext-bedrock").label("Titan Text v2", {
      fill: "#bfdbfe",
      fontSize: 8,
      dy: 8,
    });

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
          { label: "Role", value: "Vector search cache + session store" },
          { label: "Lookup", value: "Cosine similarity, sub-millisecond" },
        ],
      });
    builder.node("ext-redis").label("Vector search cache", {
      fill: "#fef3c7",
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
          { label: "Model", value: "GPT-4o (chat completions)" },
          {
            label: "Output",
            value: "Structured JSON — answer, citations, confidence",
          },
        ],
      });
    builder
      .node("ext-openai")
      .label(state.aiComplete ? "✓ Tokens received" : "GPT-4o (chat)", {
        fill: state.aiComplete ? "#86efac" : "#bfdbfe",
        fontSize: 8,
        dy: 8,
      });

    // Aurora PostgreSQL
    builder
      .node("ext-aurora")
      .at(POS["ext-aurora"].x, POS["ext-aurora"].y)
      .rect(140, 48, 10)
      .fill(hot("ext-aurora") ? "#713f12" : "#0f172a")
      .stroke(
        state.resultStored
          ? "#eab308"
          : hot("ext-aurora")
            ? "#f59e0b"
            : "#334155",
        1.6,
      )
      .label("Aurora PostgreSQL", {
        fill: "#fde047",
        fontSize: 11,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Aurora PostgreSQL",
        sections: [
          { label: "Role", value: "Conversation history (5+ year retention)" },
          { label: "Tables", value: "conversations + messages" },
        ],
      });
    builder
      .node("ext-aurora")
      .label(
        state.resultStored ? "✓ History persisted" : "conversations table",
        {
          fill: state.resultStored ? "#fde047" : "#fef9c3",
          fontSize: 8,
          dy: 8,
        },
      );

    // Langfuse
    builder
      .node("ext-langfuse")
      .at(POS["ext-langfuse"].x, POS["ext-langfuse"].y)
      .rect(140, 48, 10)
      .fill(hot("ext-langfuse") ? "#064e3b" : "#0f172a")
      .stroke(
        state.notificationSent
          ? "#22c55e"
          : hot("ext-langfuse")
            ? "#22c55e"
            : "#334155",
        1.6,
      )
      .label("Langfuse", {
        fill: "#86efac",
        fontSize: 11,
        fontWeight: "bold",
        dy: -4,
      })
      .tooltip({
        title: "Langfuse",
        sections: [
          { label: "Role", value: "LLM observability — self-hosted" },
          { label: "Tracks", value: "Tokens, cost, latency, quality scores" },
        ],
      });
    builder
      .node("ext-langfuse")
      .label(
        state.notificationSent ? "✓ Trace recorded" : "LLM observability",
        {
          fill: state.notificationSent ? "#86efac" : "#bbf7d0",
          fontSize: 8,
          dy: 8,
        },
      );

    // ═══════════════════════════════════════════════════
    // EDGES — Trigger Chain
    // ═══════════════════════════════════════════════════

    // Client → WebSocket API
    builder
      .edge("client", "wsapi", "e-client-ws")
      .arrow(true)
      .stroke(
        hot("client") && hot("wsapi") ? "#a78bfa" : "#64748b",
        hot("client") && hot("wsapi") ? 2.4 : 1.6,
      )
      .label("WSS", { fill: "#c4b5fd", fontSize: 8 });

    // WebSocket API → Lambda
    builder
      .edge("wsapi", "gateway", "e-ws-gateway")
      .arrow(true)
      .stroke(
        hot("wsapi") && hot("gateway") ? "#818cf8" : "#64748b",
        hot("wsapi") && hot("gateway") ? 2.4 : 1.6,
      )
      .label("Lambda invoke", { fill: "#c4b5fd", fontSize: 8 });

    // Lambda → SQS SendMessage
    builder
      .edge("gateway", "sqs-send", "e-gw-sqs")
      .arrow(true)
      .stroke(
        hot("gateway") && hot("sqs-send") ? "#ef4444" : "#64748b",
        hot("gateway") && hot("sqs-send") ? 2.4 : 1.6,
      )
      .label("SendMessage", { fill: "#fca5a5", fontSize: 8 });

    // ═══════════════════════════════════════════════════
    // EDGES — SQS Internal
    // ═══════════════════════════════════════════════════

    builder
      .edge("sqs-send", "sqs-buffer", "e-sqs-enqueue")
      .arrow(true)
      .stroke(
        hot("sqs-send") && hot("sqs-buffer") ? "#ef4444" : "#991b1b",
        hot("sqs-send") && hot("sqs-buffer") ? 1.8 : 1.2,
      )
      .label("enqueue", { fill: "#fca5a5", fontSize: 7 });

    builder
      .edge("sqs-buffer", "sqs-poll", "e-sqs-dequeue")
      .arrow(true)
      .stroke(
        hot("sqs-buffer") && hot("sqs-poll") ? "#f87171" : "#991b1b",
        hot("sqs-buffer") && hot("sqs-poll") ? 1.8 : 1.2,
      )
      .label("dequeue", { fill: "#fca5a5", fontSize: 7 });

    // SQS → ECS Consumer
    builder
      .edge("sqs-poll", "ecs-consume", "e-sqs-ecs")
      .arrow(true)
      .stroke(
        hot("sqs-poll") && hot("ecs-consume") ? "#a78bfa" : "#64748b",
        hot("sqs-poll") && hot("ecs-consume") ? 2.4 : 1.6,
      )
      .label("ReceiveMessage", { fill: "#c4b5fd", fontSize: 7 });

    // ═══════════════════════════════════════════════════
    // EDGES — ECS Internal (vertical chain)
    // ═══════════════════════════════════════════════════

    builder
      .edge("ecs-consume", "ecs-embed", "e-consume-embed")
      .arrow(true)
      .stroke(
        hot("ecs-consume") && hot("ecs-embed") ? "#818cf8" : "#475569",
        hot("ecs-consume") && hot("ecs-embed") ? 2.2 : 1.4,
      );

    builder
      .edge("ecs-embed", "ecs-cache", "e-embed-cache")
      .arrow(true)
      .stroke(
        hot("ecs-embed") && hot("ecs-cache") ? "#818cf8" : "#475569",
        hot("ecs-embed") && hot("ecs-cache") ? 2.2 : 1.4,
      );

    builder
      .edge("ecs-cache", "ecs-infer", "e-cache-infer")
      .arrow(true)
      .stroke(
        hot("ecs-cache") && hot("ecs-infer") ? "#818cf8" : "#475569",
        hot("ecs-cache") && hot("ecs-infer") ? 2.2 : 1.4,
      )
      .label(state.cacheChecked ? "miss" : "", {
        fill: "#fca5a5",
        fontSize: 8,
      });

    builder
      .edge("ecs-infer", "ecs-persist", "e-infer-persist")
      .arrow(true)
      .stroke(
        hot("ecs-infer") && hot("ecs-persist") ? "#818cf8" : "#475569",
        hot("ecs-infer") && hot("ecs-persist") ? 2.2 : 1.4,
      );

    builder
      .edge("ecs-persist", "ecs-trace", "e-persist-trace")
      .arrow(true)
      .stroke(
        hot("ecs-persist") && hot("ecs-trace") ? "#818cf8" : "#475569",
        hot("ecs-persist") && hot("ecs-trace") ? 2.2 : 1.4,
      );

    builder
      .edge("ecs-trace", "ecs-reply", "e-trace-reply")
      .arrow(true)
      .stroke(
        hot("ecs-trace") && hot("ecs-reply") ? "#818cf8" : "#475569",
        hot("ecs-trace") && hot("ecs-reply") ? 2.2 : 1.4,
      );

    // ═══════════════════════════════════════════════════
    // EDGES — Service Calls (dashed — to external services)
    // ═══════════════════════════════════════════════════

    // Generate Embedding → Bedrock
    builder
      .edge("ecs-embed", "ext-bedrock", "e-embed-bedrock")
      .arrow(true)
      .stroke(
        hot("ecs-embed") && hot("ext-bedrock") ? "#38bdf8" : "#475569",
        hot("ecs-embed") && hot("ext-bedrock") ? 1.6 : 1,
      )
      .dashed()
      .label("HTTPS (Bedrock)", { fill: "#93c5fd", fontSize: 7 });

    // Cache Lookup → Redis
    builder
      .edge("ecs-cache", "ext-redis", "e-cache-redis")
      .arrow(true)
      .stroke(
        hot("ecs-cache") && hot("ext-redis") ? "#f59e0b" : "#475569",
        hot("ecs-cache") && hot("ext-redis") ? 1.6 : 1,
      )
      .dashed()
      .label("Vector → Redis", { fill: "#fde68a", fontSize: 7 });

    // LLM Inference → OpenAI
    builder
      .edge("ecs-infer", "ext-openai", "e-infer-openai")
      .arrow(true)
      .stroke(
        hot("ecs-infer") && hot("ext-openai") ? "#3b82f6" : "#475569",
        hot("ecs-infer") && hot("ext-openai") ? 1.6 : 1,
      )
      .dashed()
      .label("HTTPS (REST)", { fill: "#93c5fd", fontSize: 7 });

    // Persist → Aurora
    builder
      .edge("ecs-persist", "ext-aurora", "e-persist-aurora")
      .arrow(true)
      .stroke(
        state.resultStored ? "#eab308" : "#475569",
        state.resultStored ? 1.2 : 1,
      )
      .dashed()
      .label("TCP/TLS (pg)", { fill: "#fde047", fontSize: 7 });

    // Persist → Redis (cache store)
    builder
      .edge("ecs-persist", "ext-redis", "e-persist-redis")
      .arrow(true)
      .stroke(
        state.resultStored ? "#f59e0b" : "#475569",
        state.resultStored ? 1.2 : 1,
      )
      .dashed()
      .label("cache response", { fill: "#fde68a", fontSize: 7 });

    // Record Trace → Langfuse
    builder
      .edge("ecs-trace", "ext-langfuse", "e-trace-langfuse")
      .arrow(true)
      .stroke(
        hot("ecs-trace") && hot("ext-langfuse") ? "#22c55e" : "#475569",
        hot("ecs-trace") && hot("ext-langfuse") ? 1.6 : 1,
      )
      .dashed()
      .label("HTTPS (trace)", { fill: "#86efac", fontSize: 7 });

    // ═══════════════════════════════════════════════════
    // EDGES — Response path
    // ═══════════════════════════════════════════════════

    // ECS Reply → API GW WebSocket (postToConnection)
    builder
      .edge("ecs-reply", "wsapi", "e-reply-ws")
      .arrow(true)
      .stroke(
        state.responseStreamed ? "#a78bfa" : "#475569",
        state.responseStreamed ? 2 : 1.2,
      )
      .dashed()
      .label("postToConnection", {
        fill: state.responseStreamed ? "#c4b5fd" : "#94a3b8",
        fontSize: 8,
      });

    // WebSocket → Client (stream)
    builder
      .edge("wsapi", "client", "e-ws-stream")
      .arrow(true)
      .stroke(state.responseStreamed ? "#a78bfa" : "#475569", 2)
      .dashed()
      .label(state.responseStreamed ? "WSS ← stream" : "WSS (response)", {
        fill: state.responseStreamed ? "#c4b5fd" : "#94a3b8",
        fontSize: 9,
        dy: 20,
      });
  },

  getStatBadges(state: InsuranceDesignState) {
    return [
      { label: "Variant", value: "LLM Platform", color: "#a78bfa" },
      {
        label: "Protocol",
        value: state.wsConnected ? "WSS ✓" : "WSS",
        color: state.wsConnected ? "#22c55e" : "#94a3b8",
      },
      {
        label: "Embeddings",
        value: state.embedded ? "Vector ✓" : "Titan v2",
        color: state.embedded ? "#38bdf8" : "#94a3b8",
      },
      {
        label: "LLM",
        value: state.aiComplete ? "GPT-4o ✓" : "GPT-4o",
        color: state.aiComplete ? "#22c55e" : "#94a3b8",
      },
      {
        label: "Rate Limit",
        value: state.orchestratorActive ? "SQS buffered" : "—",
        color: state.orchestratorActive ? "#f87171" : "#94a3b8",
      },
    ];
  },

  softReset(state: InsuranceDesignState) {
    state.wsConnected = false;
    state.embedded = false;
    state.cacheChecked = false;
    state.aiProcessing = false;
    state.aiComplete = false;
    state.resultStored = false;
    state.notificationSent = false;
    state.responseStreamed = false;
  },
};
