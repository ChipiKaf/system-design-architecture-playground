import type { GraphqlAdapter } from "./types";
import type { GraphqlState } from "../graphqlSlice";

/* ── Node positions (canvas 1300×700) ────────────────── */
const POS = {
  client: { x: 100, y: 340 },
  appsync: { x: 350, y: 340 },
  resolver: { x: 620, y: 340 },
  schema: { x: 490, y: 170 },
  dynamo: { x: 900, y: 340 },
  subscribers: { x: 900, y: 530 },
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
    y: 283,
    w: 210,
    h: 114,
    rx: 12,
    label: "Data Layer",
    labelX: 900,
    labelY: 297,
  },
};

export const mutationOpAdapter: GraphqlAdapter = {
  id: "mutation-op",

  profile: {
    label: "Mutation (Write)",
    description:
      "Mutations are write operations that create, update, or delete data. The GraphQL specification states that only top-level mutation fields may have side effects — ensuring predictable execution and clear separation of reads and writes.",
  },

  colors: { fill: "#064e3b", stroke: "#22c55e" },

  computeMetrics(state: GraphqlState) {
    const p = state.phase;
    state.endpoints = p !== "overview" ? "single" : "none";
    state.schemaVisible = ["validate", "summary"].includes(p);
    state.roundTrips = ["response", "summary"].includes(p) ? 1 : 0;
    state.responseFields = ["response", "summary"].includes(p) ? 2 : 0;
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
      .fill(hot("client") ? "#064e3b" : "#0f172a")
      .stroke(hot("client") ? "#22c55e" : "#334155", 2)
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
          l.color("type Mutation {", "#c084fc", { fontSize: 8 });
          l.newline();
          l.color("  createPost(…): Post", "#c084fc", { fontSize: 8 });
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
      .rect(170, 60, 12)
      .fill(isValidate || isResolve ? "#064e3b" : "#0f172a")
      .stroke(isValidate || isResolve ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Mutation Resolver");
          l.newline();
          l.color(
            isResolve ? "PutItem…" : "Write handler",
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
          l.color(
            isResolve ? "✓ Item written" : "NoSQL · on-demand",
            isResolve ? "#fde68a" : "#fde68a",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("subscribers")
      .at(POS.subscribers.x, POS.subscribers.y)
      .rect(160, 60, 12)
      .fill(isResponse || isSummary ? "#4c1d95" : "#0f172a")
      .stroke(isResponse || isSummary ? "#a78bfa" : "#1e293b", 2)
      .richLabel(
        (l: any) => {
          l.bold("Subscriptions");
          l.newline();
          l.color(
            isResponse || isSummary
              ? "⚡ Push to subscribers"
              : "WebSocket listeners",
            isResponse || isSummary ? "#c4b5fd" : "#64748b",
            { fontSize: 9 },
          );
        },
        {
          fill: isResponse || isSummary ? "#ede9fe" : "#64748b",
          fontSize: 10,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    /* ── Edges ──────────────────────────────────────── */
    builder
      .edge("client", "appsync", "client-appsync")
      .stroke(isRequest || hot("client") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("mutation { … }", { fill: "#86efac", fontSize: 9 });

    builder
      .edge("appsync", "resolver", "appsync-resolver")
      .stroke(isValidate || isResolve ? "#22c55e" : "#475569", 2)
      .arrow(true);

    builder
      .edge("schema", "resolver", "schema-resolver")
      .stroke(isValidate ? "#a855f7" : "#1e293b", 1)
      .dashed()
      .label(isValidate ? "validate inputs" : "", {
        fill: "#c084fc",
        fontSize: 8,
      });

    builder
      .edge("resolver", "dynamo", "resolver-dynamo")
      .stroke(isResolve ? "#eab308" : "#475569", 2)
      .arrow(true)
      .label(isResolve ? "PutItem" : "", { fill: "#fde68a", fontSize: 8 });

    // Mutation triggers subscription push
    builder
      .edge("appsync", "subscribers", "appsync-subs")
      .stroke(isResponse || isSummary ? "#a78bfa" : "#1e293b", 1)
      .dashed()
      .arrow(true)
      .label(isResponse ? "push event" : "", {
        fill: "#c4b5fd",
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
            w: 240,
            h: 28,
            rx: 6,
            fill: "#052e16",
            stroke: "#22c55e",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "mutation-box" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 190,
            y: POS.client.y - 28,
            text: "Write operation · has side effects",
            fill: "#86efac",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "mutation-note" },
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
            w: 195,
            h: 38,
            rx: 6,
            fill: "#052e16",
            stroke: "#22c55e",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "write-box" },
        );
        o.add(
          "text",
          {
            x: POS.resolver.x + 87,
            y: POS.resolver.y + 82,
            text: "Side effects allowed here",
            fill: "#86efac",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "write-note-1" },
        );
        o.add(
          "text",
          {
            x: POS.resolver.x + 87,
            y: POS.resolver.y + 95,
            text: "Top-level fields only",
            fill: "#6ee7b7",
            fontSize: 8,
          },
          { key: "write-note-2" },
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
            text: "✓ { id, title }",
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
            text: "Created item returned",
            fill: "#6ee7b7",
            fontSize: 8,
          },
          { key: "resp-detail" },
        );
        // Subscription push annotation
        o.add(
          "rect",
          {
            x: POS.subscribers.x - 10,
            y: POS.subscribers.y + 68,
            w: 185,
            h: 28,
            rx: 6,
            fill: "#2e1065",
            stroke: "#a78bfa",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "sub-push-box" },
        );
        o.add(
          "text",
          {
            x: POS.subscribers.x + 82,
            y: POS.subscribers.y + 87,
            text: "⚡ onCreatePost triggered",
            fill: "#c4b5fd",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "sub-push-text" },
        );
      });
    }
  },

  getStatBadges(state: GraphqlState) {
    return [
      { label: "Operation", value: "mutation", color: "#22c55e" },
      { label: "Side effects", value: "Yes", color: "#fbbf24" },
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
