import type { GraphqlAdapter } from "./types";
import type { GraphqlState } from "../graphqlSlice";

/* ── Node positions (canvas 1300×700) ────────────────── */
const POS = {
  client: { x: 100, y: 340 },
  appsync: { x: 380, y: 340 },
  filter: { x: 650, y: 340 },
  schema: { x: 520, y: 170 },
  wsConn: { x: 380, y: 530 },
  "mutation-src": { x: 650, y: 530 },
};

const ZONES = {
  appsyncManaged: {
    x: 275,
    y: 130,
    w: 460,
    h: 285,
    rx: 16,
    label: "AWS AppSync — Managed Service",
    labelX: 505,
    labelY: 144,
  },
  realtime: {
    x: 275,
    y: 475,
    w: 460,
    h: 130,
    rx: 12,
    label: "Real-time Layer",
    labelX: 505,
    labelY: 489,
  },
};

export const subscriptionOpAdapter: GraphqlAdapter = {
  id: "subscription-op",

  profile: {
    label: "Subscription (Real-time)",
    description:
      "Subscriptions provide real-time updates to clients via persistent WebSocket connections. When a client subscribes to an event, AppSync pushes updates whenever a matching mutation fires — used for live chat, notifications, and collaborative features.",
  },

  colors: { fill: "#4c1d95", stroke: "#a78bfa" },

  computeMetrics(state: GraphqlState) {
    const p = state.phase;
    state.endpoints = p !== "overview" ? "single" : "none";
    state.schemaVisible = ["validate", "summary"].includes(p);
    state.roundTrips = 0; // subscriptions are push-based
    state.responseFields = ["resolve", "response", "summary"].includes(p)
      ? 2
      : 0;
    state.fetchStrategy = ["resolve", "response", "summary"].includes(p)
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
          x: ZONES.realtime.x,
          y: ZONES.realtime.y,
          w: ZONES.realtime.w,
          h: ZONES.realtime.h,
          rx: ZONES.realtime.rx,
          fill: "rgba(167, 139, 250, 0.04)",
          stroke: "rgba(167, 139, 250, 0.25)",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
          opacity: 1,
        },
        { key: "zone-realtime" },
      );
      o.add(
        "text",
        {
          x: ZONES.realtime.labelX,
          y: ZONES.realtime.labelY,
          text: ZONES.realtime.label,
          fill: "rgba(167, 139, 250, 0.55)",
          fontSize: 10,
          fontWeight: "600",
        },
        { key: "zone-realtime-label" },
      );
    });

    /* ── Nodes ──────────────────────────────────────── */
    builder
      .node("client")
      .at(POS.client.x, POS.client.y)
      .rect(140, 60, 12)
      .fill(hot("client") ? "#4c1d95" : "#0f172a")
      .stroke(hot("client") ? "#a78bfa" : "#334155", 2)
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
          l.color(
            isRequest ? "WSS upgrade" : "POST /graphql",
            isRequest ? "#f9a8d4" : "#f9a8d4",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("schema")
      .at(POS.schema.x, POS.schema.y)
      .rect(170, 70, 12)
      .fill(state.schemaVisible || isValidate ? "#3b0764" : "#0f172a")
      .stroke(state.schemaVisible || isValidate ? "#a855f7" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Schema (SDL)");
          l.newline();
          l.color("type Subscription {", "#c084fc", { fontSize: 8 });
          l.newline();
          l.color("  onCreatePost: Post", "#c084fc", { fontSize: 8 });
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
      .node("filter")
      .at(POS.filter.x, POS.filter.y)
      .rect(170, 60, 12)
      .fill(isValidate || isResolve ? "#4c1d95" : "#0f172a")
      .stroke(isValidate || isResolve ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Subscription Filter");
          l.newline();
          l.color(
            isResolve
              ? "✓ Event matched"
              : isValidate
                ? "Registering…"
                : "Event evaluator",
            isResolve ? "#c4b5fd" : isValidate ? "#c4b5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        {
          fill: isValidate || isResolve ? "#ede9fe" : "#fff",
          fontSize: 10,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    builder
      .node("wsConn")
      .at(POS.wsConn.x, POS.wsConn.y)
      .rect(160, 56, 12)
      .fill(isRequest || isResolve ? "#4c1d95" : "#0f172a")
      .stroke(isRequest || isResolve ? "#a78bfa" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("WebSocket");
          l.newline();
          l.color(
            isRequest || isResolve || isResponse || isSummary
              ? "✓ Connected"
              : "wss://appsync…",
            isRequest || isResolve ? "#c4b5fd" : "#64748b",
            { fontSize: 9 },
          );
        },
        {
          fill:
            isRequest || isResolve || isResponse || isSummary
              ? "#ede9fe"
              : "#64748b",
          fontSize: 10,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    builder
      .node("mutation-src")
      .at(POS["mutation-src"].x, POS["mutation-src"].y)
      .rect(170, 56, 12)
      .fill(isResolve ? "#064e3b" : "#0f172a")
      .stroke(isResolve ? "#22c55e" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Mutation Source");
          l.newline();
          l.color(
            isResolve ? "createPost fired" : "Another client / API",
            isResolve ? "#86efac" : "#64748b",
            { fontSize: 9 },
          );
        },
        {
          fill: isResolve ? "#dcfce7" : "#64748b",
          fontSize: 10,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    /* ── Edges ──────────────────────────────────────── */
    // Client → AppSync (subscription request)
    builder
      .edge("client", "appsync", "client-appsync")
      .stroke(isRequest || hot("client") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("subscription { … }", { fill: "#c4b5fd", fontSize: 9 });

    // AppSync → Filter (register)
    builder
      .edge("appsync", "filter", "appsync-filter")
      .stroke(isValidate || isResolve ? "#a78bfa" : "#475569", 2)
      .arrow(true);

    // Schema → Filter (validate subscription)
    builder
      .edge("schema", "filter", "schema-filter")
      .stroke(isValidate ? "#a855f7" : "#1e293b", 1)
      .dashed()
      .label(isValidate ? "validate" : "", { fill: "#c084fc", fontSize: 8 });

    // Client ↔ WebSocket
    builder
      .edge("client", "wsConn", "client-ws")
      .stroke(isRequest || isResolve ? "#a78bfa" : "#1e293b", 1)
      .dashed()
      .label(isRequest ? "WSS" : "", { fill: "#c4b5fd", fontSize: 8 });

    // Mutation source → AppSync (incoming mutation)
    builder
      .edge("mutation-src", "appsync", "mutsrc-appsync")
      .stroke(isResolve ? "#22c55e" : "#1e293b", 2)
      .arrow(true)
      .label(isResolve ? "createPost(…)" : "", {
        fill: "#86efac",
        fontSize: 8,
      });

    // Filter → Client (push via WebSocket)
    builder
      .edge("filter", "client", "filter-client")
      .stroke(isResolve || isResponse || isSummary ? "#a78bfa" : "#1e293b", 2)
      .arrow(true)
      .label(isResolve ? "⚡ push" : "", { fill: "#c4b5fd", fontSize: 8 });

    /* ── Overlays ───────────────────────────────────── */
    if (isRequest) {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.client.x + 70,
            y: POS.client.y - 42,
            w: 240,
            h: 28,
            rx: 6,
            fill: "#2e1065",
            stroke: "#a78bfa",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "sub-box" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 190,
            y: POS.client.y - 28,
            text: "Long-lived · server pushes data",
            fill: "#c4b5fd",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "sub-note" },
        );
      });
    }

    if (isResolve) {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.filter.x - 10,
            y: POS.filter.y + 68,
            w: 195,
            h: 38,
            rx: 6,
            fill: "#2e1065",
            stroke: "#a78bfa",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "filter-box" },
        );
        o.add(
          "text",
          {
            x: POS.filter.x + 87,
            y: POS.filter.y + 82,
            text: "Matches: onCreatePost",
            fill: "#c4b5fd",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "filter-text-1" },
        );
        o.add(
          "text",
          {
            x: POS.filter.x + 87,
            y: POS.filter.y + 95,
            text: "→ Push to WebSocket",
            fill: "#ddd6fe",
            fontSize: 8,
          },
          { key: "filter-text-2" },
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
            w: 220,
            h: 38,
            rx: 6,
            fill: "#2e1065",
            stroke: "#a78bfa",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "push-box" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 105,
            y: POS.client.y + 82,
            text: "⚡ { id, title } pushed",
            fill: "#c4b5fd",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "push-text" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 105,
            y: POS.client.y + 96,
            text: "No polling · real-time",
            fill: "#ddd6fe",
            fontSize: 8,
          },
          { key: "push-detail" },
        );
      });
    }
  },

  getStatBadges() {
    return [
      { label: "Operation", value: "subscription", color: "#a78bfa" },
      { label: "Transport", value: "WebSocket", color: "#c4b5fd" },
      { label: "Push model", value: "Server → Client", color: "#86efac" },
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
