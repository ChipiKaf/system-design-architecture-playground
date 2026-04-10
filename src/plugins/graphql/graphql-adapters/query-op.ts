import type { GraphqlAdapter } from "./types";
import type { GraphqlState } from "../graphqlSlice";

/* ── Node positions (canvas 1300×700) ────────────────── */
const POS = {
  client: { x: 100, y: 340 },
  appsync: { x: 350, y: 340 },
  resolver: { x: 620, y: 340 },
  schema: { x: 490, y: 170 },
  dynamo: { x: 900, y: 340 },
  cache: { x: 900, y: 170 },
};

const ZONES = {
  appsyncManaged: {
    x: 245,
    y: 130,
    w: 490,
    h: 285,
    rx: 16,
    label: "AWS AppSync — Managed Service",
    labelX: 490,
    labelY: 144,
  },
  dataLayer: {
    x: 795,
    y: 130,
    w: 210,
    h: 285,
    rx: 12,
    label: "Data Layer",
    labelX: 900,
    labelY: 144,
  },
};

export const queryOpAdapter: GraphqlAdapter = {
  id: "query-op",

  profile: {
    label: "Query (Read)",
    description:
      "Queries are read-only operations used for retrieving data. They must be side-effect free — they only fetch application state, never modify it. AppSync can cache query responses for performance.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  computeMetrics(state: GraphqlState) {
    const p = state.phase;
    state.endpoints = p !== "overview" ? "single" : "none";
    state.schemaVisible = ["validate", "summary"].includes(p);
    state.roundTrips = ["response", "summary"].includes(p) ? 1 : 0;
    state.responseFields = ["response", "summary"].includes(p) ? 3 : 0;
    state.fetchStrategy = ["response", "summary"].includes(p)
      ? "exact"
      : "none";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [];
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
          x: ZONES.appsyncManaged.x,
          y: ZONES.appsyncManaged.y,
          w: ZONES.appsyncManaged.w,
          h: ZONES.appsyncManaged.h,
          rx: ZONES.appsyncManaged.rx,
          fill: "rgba(229, 53, 171, 0.04)",
          stroke: "rgba(229, 53, 171, 0.25)",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
          opacity: 1,
        },
        { key: "zone-appsync" },
      );
      o.add(
        "text",
        {
          x: ZONES.appsyncManaged.labelX,
          y: ZONES.appsyncManaged.labelY,
          text: ZONES.appsyncManaged.label,
          fill: "rgba(229, 53, 171, 0.55)",
          fontSize: 10,
          fontWeight: "600",
        },
        { key: "zone-appsync-label" },
      );
      o.add(
        "rect",
        {
          x: ZONES.dataLayer.x,
          y: ZONES.dataLayer.y,
          w: ZONES.dataLayer.w,
          h: ZONES.dataLayer.h,
          rx: ZONES.dataLayer.rx,
          fill: "rgba(234, 179, 8, 0.04)",
          stroke: "rgba(234, 179, 8, 0.25)",
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
          fill: "rgba(234, 179, 8, 0.55)",
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
          l.color("Amplify SDK", "#94a3b8", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("appsync")
      .at(POS.appsync.x, POS.appsync.y)
      .rect(160, 60, 12)
      .fill(hot("appsync") || isRequest ? "#1e3a5f" : "#0f172a")
      .stroke(hot("appsync") || isRequest ? "#e535ab" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("AWS AppSync");
          l.newline();
          l.color("POST /graphql", "#f9a8d4", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("schema")
      .at(POS.schema.x, POS.schema.y)
      .rect(160, 70, 12)
      .fill(state.schemaVisible || isValidate ? "#3b0764" : "#0f172a")
      .stroke(state.schemaVisible || isValidate ? "#a855f7" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Schema (SDL)");
          l.newline();
          l.color("type Query {", "#c084fc", { fontSize: 8 });
          l.newline();
          l.color("  user(id: ID!): User", "#c084fc", { fontSize: 8 });
          l.newline();
          l.color("}", "#c084fc", { fontSize: 8 });
        },
        {
          fill: state.schemaVisible || isValidate ? "#e9d5ff" : "#64748b",
          fontSize: 10,
          dy: -8,
          lineHeight: 1.4,
        },
      );

    builder
      .node("resolver")
      .at(POS.resolver.x, POS.resolver.y)
      .rect(160, 60, 12)
      .fill(isValidate || isResolve ? "#064e3b" : "#0f172a")
      .stroke(isValidate || isResolve ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Query Resolver");
          l.newline();
          l.color(
            isResolve ? "GetItem…" : "Read-only handler",
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
      .node("dynamo")
      .at(POS.dynamo.x, POS.dynamo.y)
      .rect(140, 64, 12)
      .fill(hot("dynamo") || isResolve ? "#713f12" : "#0f172a")
      .stroke(hot("dynamo") || isResolve ? "#eab308" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("DynamoDB");
          l.newline();
          l.color("NoSQL · on-demand", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("cache")
      .at(POS.cache.x, POS.cache.y)
      .rect(140, 56, 12)
      .fill(isResponse || isSummary ? "#1e3a5f" : "#0f172a")
      .stroke(isResponse || isSummary ? "#60a5fa" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("AppSync Cache");
          l.newline();
          l.color(
            isResponse ? "✓ Cached" : "TTL-based",
            isResponse ? "#93c5fd" : "#64748b",
            { fontSize: 9 },
          );
        },
        {
          fill: isResponse || isSummary ? "#dbeafe" : "#64748b",
          fontSize: 10,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    /* ── Edges ──────────────────────────────────────── */
    builder
      .edge("client", "appsync", "client-appsync")
      .stroke(isRequest || hot("client") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("query { … }", { fill: "#93c5fd", fontSize: 9 });

    builder
      .edge("appsync", "resolver", "appsync-resolver")
      .stroke(isValidate || isResolve ? "#22c55e" : "#475569", 2)
      .arrow(true);

    builder
      .edge("schema", "resolver", "schema-resolver")
      .stroke(isValidate ? "#a855f7" : "#1e293b", 1)
      .dashed()
      .label(isValidate ? "validate" : "", { fill: "#c084fc", fontSize: 8 });

    builder
      .edge("resolver", "dynamo", "resolver-dynamo")
      .stroke(isResolve ? "#eab308" : "#475569", 2)
      .arrow(true)
      .label(isResolve ? "GetItem" : "", { fill: "#fde68a", fontSize: 8 });

    builder
      .edge("dynamo", "cache", "dynamo-cache")
      .stroke(isResponse || isSummary ? "#60a5fa" : "#1e293b", 1)
      .dashed()
      .label(isResponse ? "cache result" : "", {
        fill: "#93c5fd",
        fontSize: 8,
      });

    /* ── Overlays ───────────────────────────────────── */
    if (isRequest) {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.client.x + 70,
            y: POS.client.y - 42,
            w: 220,
            h: 28,
            rx: 6,
            fill: "#1e1b4b",
            stroke: "#3b82f6",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "query-box" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 180,
            y: POS.client.y - 28,
            text: "Read-only · no side effects",
            fill: "#93c5fd",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "query-note" },
        );
      });
    }

    if (isResolve) {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.resolver.x - 10,
            y: POS.resolver.y + 68,
            w: 185,
            h: 28,
            rx: 6,
            fill: "#052e16",
            stroke: "#22c55e",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "projection-box" },
        );
        o.add(
          "text",
          {
            x: POS.resolver.x + 82,
            y: POS.resolver.y + 87,
            text: "ProjectionExpression: name",
            fill: "#86efac",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "projection-text" },
        );
      });
    }

    if (isResponse || isSummary) {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.client.x - 5,
            y: POS.client.y + 68,
            w: 200,
            h: 38,
            rx: 6,
            fill: "#052e16",
            stroke: "#22c55e",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "resp-box" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 95,
            y: POS.client.y + 82,
            text: "✓ { name, email, avatar }",
            fill: "#86efac",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "resp-text" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 95,
            y: POS.client.y + 96,
            text: "Exact fields · cacheable",
            fill: "#6ee7b7",
            fontSize: 8,
          },
          { key: "resp-detail" },
        );
      });
    }
  },

  getStatBadges(state: GraphqlState) {
    return [
      { label: "Operation", value: "query", color: "#3b82f6" },
      { label: "Side effects", value: "None", color: "#86efac" },
      {
        label: "Round trips",
        value: state.roundTrips > 0 ? String(state.roundTrips) : "—",
        color: "#93c5fd",
      },
    ];
  },

  softReset(state: GraphqlState) {
    state.endpoints = "none";
    state.fetchStrategy = "none";
    state.schemaVisible = false;
    state.responseFields = 0;
    state.roundTrips = 0;
  },
};
