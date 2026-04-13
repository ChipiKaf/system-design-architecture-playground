import type { GraphqlAdapter } from "./types";
import type { GraphqlState } from "../graphqlSlice";

/* ── Node positions (canvas 1300×700) ────────────────── */
const POS = {
  client: { x: 80, y: 340 },
  graphql: { x: 310, y: 340 },
  claimsRes: { x: 560, y: 200 },
  holderRes: { x: 560, y: 480 },
  db: { x: 860, y: 340 },
  counter: { x: 1120, y: 200 },
  result: { x: 1120, y: 480 },
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
  dataLayer: {
    x: 755,
    y: 240,
    w: 210,
    h: 200,
    rx: 12,
    label: "Aurora PostgreSQL",
    labelX: 860,
    labelY: 254,
  },
};

export const naiveResolversAdapter: GraphqlAdapter = {
  id: "naive-resolvers",

  profile: {
    label: "Naive Resolvers (N+1 Problem)",
    description:
      "Each field has its own resolver. The claims resolver fires 1 query to get 100 claims. Then the policyholder resolver fires once PER claim — that's 100 more queries. Total: 101 queries for data that could be fetched in 1. This is the N+1 problem.",
  },

  colors: { fill: "#1e3a5f", stroke: "#ef4444" },

  computeMetrics(state: GraphqlState) {
    const p = state.phase;
    state.resolverStrategy = p !== "overview" ? "naive" : "none";
    state.batchEnabled = false;
    if (p === "overview") {
      state.queryCount = 0;
    } else if (p === "request" || p === "validate") {
      state.queryCount = 0;
    } else if (p === "resolve") {
      state.queryCount = 1;
    } else if (p === "n-plus-1") {
      state.queryCount = 101;
    } else {
      state.queryCount = 101;
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
    const isNPlus1 = p === "n-plus-1";
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
          x: ZONES.dataLayer.x,
          y: ZONES.dataLayer.y,
          w: ZONES.dataLayer.w,
          h: ZONES.dataLayer.h,
          rx: ZONES.dataLayer.rx,
          fill: isNPlus1
            ? "rgba(239, 68, 68, 0.08)"
            : "rgba(234, 179, 8, 0.04)",
          stroke: isNPlus1
            ? "rgba(239, 68, 68, 0.4)"
            : "rgba(234, 179, 8, 0.25)",
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
          text: isNPlus1 ? "Aurora — 101 QUERIES!" : "Aurora PostgreSQL",
          fill: isNPlus1 ? "rgba(239, 68, 68, 0.7)" : "rgba(234, 179, 8, 0.55)",
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
      .stroke(hot("client") ? "#ef4444" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Client App");
          l.newline();
          l.color("{ claims { policyholder } }", "#fca5a5", { fontSize: 8 });
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
      .fill(isNPlus1 ? "#7f1d1d" : "#0f172a")
      .stroke(isNPlus1 ? "#ef4444" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("policyholder() resolver");
          l.newline();
          l.color(
            isNPlus1 ? "× 100 — one per claim!" : "Runs per parent claim",
            isNPlus1 ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        {
          fill: isNPlus1 ? "#fecaca" : "#fff",
          fontSize: 10,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    builder
      .node("db")
      .at(POS.db.x, POS.db.y)
      .rect(160, 64, 12)
      .fill(hot("db") || isResolve || isNPlus1 ? "#713f12" : "#0f172a")
      .stroke(
        isNPlus1 ? "#ef4444" : hot("db") || isResolve ? "#eab308" : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("Aurora PostgreSQL");
          l.newline();
          l.color(
            isNPlus1
              ? "🔥 101 queries!"
              : state.queryCount > 0
                ? `${state.queryCount} query`
                : "Waiting…",
            isNPlus1 ? "#fca5a5" : state.queryCount > 0 ? "#fde68a" : "#64748b",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("counter")
      .at(POS.counter.x, POS.counter.y)
      .rect(140, 60, 12)
      .fill(isNPlus1 || isResponse || isSummary ? "#7f1d1d" : "#0f172a")
      .stroke(isNPlus1 || isResponse || isSummary ? "#ef4444" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Query Counter");
          l.newline();
          l.color(
            state.queryCount > 1
              ? `${state.queryCount} queries`
              : state.queryCount === 1
                ? "1 query"
                : "0",
            state.queryCount > 1 ? "#fca5a5" : "#64748b",
            { fontSize: 11 },
          );
        },
        {
          fill: state.queryCount > 1 ? "#fecaca" : "#64748b",
          fontSize: 11,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(140, 60, 12)
      .fill(isResponse || isSummary ? "#1e3a5f" : "#0f172a")
      .stroke(isResponse || isSummary ? "#f97316" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Result");
          l.newline();
          l.color(
            isResponse || isSummary ? "Slow — N+1 penalty" : "Pending…",
            isResponse || isSummary ? "#fdba74" : "#64748b",
            { fontSize: 9 },
          );
        },
        {
          fill: isResponse || isSummary ? "#fed7aa" : "#64748b",
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
      .stroke(isNPlus1 ? "#ef4444" : "#334155", isNPlus1 ? 2 : 1);
    builder
      .edge("claimsRes", "db")
      .stroke(isResolve ? "#eab308" : "#334155", isResolve ? 2 : 1);
    builder
      .edge("holderRes", "db")
      .stroke(isNPlus1 ? "#ef4444" : "#334155", isNPlus1 ? 2.5 : 1);
    builder
      .edge("db", "result")
      .stroke(isResponse ? "#f97316" : "#334155", isResponse ? 2 : 1);
  },

  getStatBadges(state: GraphqlState) {
    return [
      {
        label: "DB Queries",
        value: state.queryCount,
        color:
          state.queryCount > 10
            ? "#ef4444"
            : state.queryCount > 0
              ? "#eab308"
              : "#64748b",
      },
      { label: "Strategy", value: "Naive (N+1)", color: "#ef4444" },
    ];
  },
};
