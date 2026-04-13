import type { GraphqlAdapter } from "./types";
import type { GraphqlState } from "../graphqlSlice";

/* ── Node positions (canvas 1300×700) ────────────────── */
const POS = {
  client: { x: 80, y: 340 },
  graphql: { x: 310, y: 340 },
  resolver: { x: 560, y: 340 },
  db: { x: 860, y: 340 },
  result: { x: 1120, y: 340 },
  schema: { x: 430, y: 160 },
  sqlBox: { x: 860, y: 160 },
};

const ZONES = {
  server: {
    x: 205,
    y: 120,
    w: 470,
    h: 295,
    rx: 16,
    label: "GraphQL Server",
    labelX: 440,
    labelY: 134,
  },
  dataLayer: {
    x: 755,
    y: 120,
    w: 210,
    h: 295,
    rx: 12,
    label: "PostgreSQL (Aurora)",
    labelX: 860,
    labelY: 134,
  },
};

export const sqlJoinResolverAdapter: GraphqlAdapter = {
  id: "sql-join-resolver",

  profile: {
    label: "SQL JOIN in Resolver",
    description:
      "The resolver uses a SQL JOIN to fetch claims AND their policyholders in one query. This is the simplest approach when all your data lives in one database — one resolver, one query, all the data you need.",
  },

  colors: { fill: "#1e3a5f", stroke: "#22c55e" },

  computeMetrics(state: GraphqlState) {
    const p = state.phase;
    state.resolverStrategy = p !== "overview" ? "join" : "none";
    state.queryCount = ["resolve", "response", "summary"].includes(p) ? 1 : 0;
    state.batchEnabled = false;
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
          text: ZONES.dataLayer.label,
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
      .stroke(hot("client") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Client App");
          l.newline();
          l.color("{ claims { policyholder } }", "#86efac", { fontSize: 8 });
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
          l.color("Parse → Validate → Execute", "#f9a8d4", { fontSize: 8 });
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("schema")
      .at(POS.schema.x, POS.schema.y)
      .rect(160, 70, 12)
      .fill(isValidate ? "#3b0764" : "#0f172a")
      .stroke(isValidate ? "#a855f7" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Schema");
          l.newline();
          l.color("type Claim {", "#c084fc", { fontSize: 8 });
          l.newline();
          l.color("  policyholder: Person", "#c084fc", { fontSize: 8 });
          l.newline();
          l.color("}", "#c084fc", { fontSize: 8 });
        },
        {
          fill: isValidate ? "#e9d5ff" : "#64748b",
          fontSize: 10,
          dy: -8,
          lineHeight: 1.4,
        },
      );

    builder
      .node("resolver")
      .at(POS.resolver.x, POS.resolver.y)
      .rect(160, 60, 12)
      .fill(isResolve ? "#064e3b" : "#0f172a")
      .stroke(isResolve ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("claims Resolver");
          l.newline();
          l.color(
            isResolve ? "SELECT … JOIN …" : "SQL JOIN strategy",
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
      .node("db")
      .at(POS.db.x, POS.db.y)
      .rect(160, 64, 12)
      .fill(hot("db") || isResolve ? "#713f12" : "#0f172a")
      .stroke(hot("db") || isResolve ? "#eab308" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Aurora PostgreSQL");
          l.newline();
          l.color(
            state.queryCount > 0 ? "1 query (JOIN)" : "Waiting…",
            state.queryCount > 0 ? "#fde68a" : "#64748b",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("sqlBox")
      .at(POS.sqlBox.x, POS.sqlBox.y)
      .rect(190, 70, 8)
      .fill(isResolve || isResponse ? "#1a1a2e" : "#0f172a")
      .stroke(isResolve || isResponse ? "#22c55e" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.bold("SQL Query");
          l.newline();
          l.color("SELECT c.*, p.name", "#86efac", { fontSize: 8 });
          l.newline();
          l.color("FROM claims c", "#86efac", { fontSize: 8 });
          l.newline();
          l.color("JOIN persons p ON …", "#86efac", { fontSize: 8 });
        },
        {
          fill: isResolve || isResponse ? "#dcfce7" : "#475569",
          fontSize: 9,
          dy: -8,
          lineHeight: 1.4,
        },
      );

    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(140, 60, 12)
      .fill(isResponse || isSummary ? "#1e3a5f" : "#0f172a")
      .stroke(isResponse || isSummary ? "#60a5fa" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Result");
          l.newline();
          l.color(
            isResponse || isSummary ? "✓ 1 query total" : "Pending…",
            isResponse || isSummary ? "#93c5fd" : "#64748b",
            { fontSize: 9 },
          );
        },
        {
          fill: isResponse || isSummary ? "#dbeafe" : "#64748b",
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
      .edge("graphql", "resolver")
      .stroke(
        isValidate || isResolve ? "#22c55e" : "#334155",
        isValidate || isResolve ? 2 : 1,
      );
    builder
      .edge("resolver", "db")
      .stroke(isResolve ? "#eab308" : "#334155", isResolve ? 2 : 1);
    builder
      .edge("db", "result")
      .stroke(isResponse ? "#60a5fa" : "#334155", isResponse ? 2 : 1);
    if (isValidate) {
      builder.edge("graphql", "schema").dashed().stroke("#a855f7", 1.5);
    }
  },

  getStatBadges(state: GraphqlState) {
    return [
      {
        label: "DB Queries",
        value: state.queryCount,
        color: state.queryCount === 1 ? "#22c55e" : "#64748b",
      },
      {
        label: "Strategy",
        value: state.resolverStrategy === "join" ? "SQL JOIN" : "—",
        color: "#eab308",
      },
    ];
  },
};
