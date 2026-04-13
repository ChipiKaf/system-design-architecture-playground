import type { GraphqlAdapter } from "./types";
import type { GraphqlState } from "../graphqlSlice";

/* ── Node positions (canvas 1300×700) ────────────────── */
const POS = {
  client: { x: 80, y: 340 },
  graphql: { x: 310, y: 340 },
  claimsRes: { x: 560, y: 200 },
  holderRes: { x: 560, y: 480 },
  dataloader: { x: 780, y: 480 },
  db: { x: 1000, y: 340 },
  counter: { x: 1180, y: 200 },
  result: { x: 1180, y: 480 },
};

const ZONES = {
  server: {
    x: 205,
    y: 120,
    w: 470,
    h: 430,
    rx: 16,
    label: "GraphQL Server — Per-field Resolvers",
    labelX: 440,
    labelY: 134,
  },
  batchLayer: {
    x: 685,
    y: 415,
    w: 200,
    h: 130,
    rx: 10,
    label: "DataLoader — Batching Layer",
    labelX: 780,
    labelY: 429,
  },
  dataLayer: {
    x: 895,
    y: 240,
    w: 210,
    h: 200,
    rx: 12,
    label: "Aurora PostgreSQL",
    labelX: 1000,
    labelY: 254,
  },
};

export const dataloaderBatchingAdapter: GraphqlAdapter = {
  id: "dataloader-batching",

  profile: {
    label: "DataLoader Batching",
    description:
      "DataLoader sits between your resolvers and the database. Instead of 100 individual queries for policyholders, it collects all 100 IDs, waits for the current tick to finish, then fires ONE query: WHERE id IN (id1, id2, …, id100). Total: 2 queries instead of 101.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  computeMetrics(state: GraphqlState) {
    const p = state.phase;
    state.resolverStrategy = p !== "overview" ? "batched" : "none";
    state.batchEnabled = p !== "overview";
    if (p === "overview" || p === "request" || p === "validate") {
      state.queryCount = 0;
    } else if (p === "resolve") {
      state.queryCount = 1;
    } else if (p === "batch") {
      state.queryCount = 2;
    } else {
      state.queryCount = 2;
    }
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [];
  },

  softReset(state: GraphqlState) {
    state.queryCount = 0;
    state.batchEnabled = false;
    state.resolverStrategy = "none";
  },

  buildTopology(builder, state: GraphqlState, helpers) {
    const hot = helpers.hot;
    const p = helpers.phase;
    const isRequest = p === "request";
    const isValidate = p === "validate";
    const isResolve = p === "resolve";
    const isBatch = p === "batch";
    const isResponse = p === "response";
    const isSummary = p === "summary";

    /* ── Zones ──────────────────────────────────────── */
    builder.overlay((o: any) => {
      o.add(
        "rect",
        {
          x: ZONES.server.x,
          y: ZONES.server.y,
          w: ZONES.server.w,
          h: ZONES.server.h,
          rx: ZONES.server.rx,
          fill: "rgba(229, 53, 171, 0.04)",
          stroke: "rgba(229, 53, 171, 0.25)",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
          opacity: 1,
        },
        { key: "zone-server" },
      );
      o.add(
        "text",
        {
          x: ZONES.server.labelX,
          y: ZONES.server.labelY,
          text: ZONES.server.label,
          fill: "rgba(229, 53, 171, 0.55)",
          fontSize: 10,
          fontWeight: "600",
        },
        { key: "zone-server-label" },
      );

      o.add(
        "rect",
        {
          x: ZONES.batchLayer.x,
          y: ZONES.batchLayer.y,
          w: ZONES.batchLayer.w,
          h: ZONES.batchLayer.h,
          rx: ZONES.batchLayer.rx,
          fill: isBatch
            ? "rgba(59, 130, 246, 0.1)"
            : "rgba(59, 130, 246, 0.04)",
          stroke: isBatch
            ? "rgba(59, 130, 246, 0.5)"
            : "rgba(59, 130, 246, 0.25)",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
          opacity: 1,
        },
        { key: "zone-batch" },
      );
      o.add(
        "text",
        {
          x: ZONES.batchLayer.labelX,
          y: ZONES.batchLayer.labelY,
          text: ZONES.batchLayer.label,
          fill: isBatch
            ? "rgba(59, 130, 246, 0.8)"
            : "rgba(59, 130, 246, 0.55)",
          fontSize: 9,
          fontWeight: "600",
        },
        { key: "zone-batch-label" },
      );

      o.add(
        "rect",
        {
          x: ZONES.dataLayer.x,
          y: ZONES.dataLayer.y,
          w: ZONES.dataLayer.w,
          h: ZONES.dataLayer.h,
          rx: ZONES.dataLayer.rx,
          fill: "rgba(34, 197, 94, 0.04)",
          stroke: "rgba(34, 197, 94, 0.25)",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
          opacity: 1,
        },
        { key: "zone-data" },
      );
      o.add(
        "text",
        {
          x: ZONES.dataLayer.labelX,
          y: ZONES.dataLayer.labelY,
          text: "Aurora PostgreSQL",
          fill: "rgba(34, 197, 94, 0.55)",
          fontSize: 10,
          fontWeight: "600",
        },
        { key: "zone-data-label" },
      );
    });

    /* ── Nodes ──────────────────────────────────────── */
    builder
      .node("client")
      .at(POS.client.x, POS.client.y)
      .rect(140, 60, 12)
      .fill(hot("client") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Client App");
          l.newline();
          l.color("{ claims { policyholder } }", "#93c5fd", { fontSize: 8 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("graphql")
      .at(POS.graphql.x, POS.graphql.y)
      .rect(160, 60, 12)
      .fill(hot("graphql") || isRequest ? "#1e3a5f" : "#0f172a")
      .stroke(hot("graphql") || isRequest ? "#e535ab" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("GraphQL Engine");
          l.newline();
          l.color("Per-field execution", "#f9a8d4", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("claimsRes")
      .at(POS.claimsRes.x, POS.claimsRes.y)
      .rect(170, 60, 12)
      .fill(isResolve ? "#064e3b" : "#0f172a")
      .stroke(isResolve ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("claims() resolver");
          l.newline();
          l.color(
            isResolve ? "SELECT * FROM claims" : "1 query → 100 claims",
            isResolve ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        {
          fill: isResolve ? "#dcfce7" : "#fff",
          fontSize: 11,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    builder
      .node("holderRes")
      .at(POS.holderRes.x, POS.holderRes.y)
      .rect(170, 60, 12)
      .fill(isBatch ? "#1e3a5f" : "#0f172a")
      .stroke(isBatch ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("policyholder() resolver");
          l.newline();
          l.color(
            isBatch
              ? "× 100 → all go to DataLoader"
              : "Calls dataloader.load(id)",
            isBatch ? "#93c5fd" : "#94a3b8",
            { fontSize: 8 },
          );
        },
        {
          fill: isBatch ? "#dbeafe" : "#fff",
          fontSize: 10,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    builder
      .node("dataloader")
      .at(POS.dataloader.x, POS.dataloader.y)
      .rect(160, 60, 12)
      .fill(isBatch ? "#1e3a5f" : "#0f172a")
      .stroke(isBatch ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("DataLoader");
          l.newline();
          l.color(
            isBatch ? "Batch! WHERE id IN (…)" : "Collects IDs, batches",
            isBatch ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        {
          fill: isBatch ? "#dbeafe" : "#fff",
          fontSize: 11,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    builder
      .node("db")
      .at(POS.db.x, POS.db.y)
      .rect(160, 64, 12)
      .fill(hot("db") || isResolve || isBatch ? "#713f12" : "#0f172a")
      .stroke(hot("db") || isResolve || isBatch ? "#eab308" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Aurora PostgreSQL");
          l.newline();
          l.color(
            state.queryCount > 0
              ? `${state.queryCount} queries total`
              : "Waiting…",
            state.queryCount > 0 ? "#fde68a" : "#64748b",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("counter")
      .at(POS.counter.x, POS.counter.y)
      .rect(130, 60, 12)
      .fill(isBatch || isResponse || isSummary ? "#064e3b" : "#0f172a")
      .stroke(isBatch || isResponse || isSummary ? "#22c55e" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Query Counter");
          l.newline();
          l.color(
            state.queryCount > 0 ? `${state.queryCount} queries ✓` : "0",
            state.queryCount > 0 ? "#86efac" : "#64748b",
            { fontSize: 11 },
          );
        },
        {
          fill: state.queryCount > 0 ? "#dcfce7" : "#64748b",
          fontSize: 11,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(130, 60, 12)
      .fill(isResponse || isSummary ? "#1e3a5f" : "#0f172a")
      .stroke(isResponse || isSummary ? "#22c55e" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Result");
          l.newline();
          l.color(
            isResponse || isSummary ? "✓ 2 queries — fast!" : "Pending…",
            isResponse || isSummary ? "#86efac" : "#64748b",
            { fontSize: 9 },
          );
        },
        {
          fill: isResponse || isSummary ? "#dcfce7" : "#64748b",
          fontSize: 11,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    /* ── Edges ──────────────────────────────────────── */
    builder
      .edge("client", "graphql")
      .stroke(isRequest ? "#e535ab" : "#334155", isRequest ? 2 : 1);
    builder
      .edge("graphql", "claimsRes")
      .stroke(isResolve ? "#22c55e" : "#334155", isResolve ? 2 : 1);
    builder
      .edge("graphql", "holderRes")
      .stroke(isBatch ? "#3b82f6" : "#334155", isBatch ? 2 : 1);
    builder
      .edge("claimsRes", "db")
      .stroke(isResolve ? "#eab308" : "#334155", isResolve ? 2 : 1);
    builder
      .edge("holderRes", "dataloader")
      .stroke(isBatch ? "#3b82f6" : "#334155", isBatch ? 2 : 1);
    builder
      .edge("dataloader", "db")
      .stroke(isBatch ? "#eab308" : "#334155", isBatch ? 2 : 1);
    builder
      .edge("db", "result")
      .stroke(isResponse ? "#22c55e" : "#334155", isResponse ? 2 : 1);
  },

  getStatBadges(state: GraphqlState) {
    return [
      {
        label: "DB Queries",
        value: state.queryCount,
        color:
          state.queryCount <= 2 && state.queryCount > 0 ? "#22c55e" : "#64748b",
      },
      { label: "Strategy", value: "DataLoader", color: "#3b82f6" },
      {
        label: "Batching",
        value: state.batchEnabled ? "ON" : "OFF",
        color: state.batchEnabled ? "#22c55e" : "#64748b",
      },
    ];
  },
};
