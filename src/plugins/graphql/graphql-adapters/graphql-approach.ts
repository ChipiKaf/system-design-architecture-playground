import type { GraphqlAdapter } from "./types";
import type { GraphqlState } from "../graphqlSlice";

/* ── Node positions (canvas 1300×700) ────────────────── */
const POS = {
  cognito: { x: 100, y: 80 }, // standalone — separate service
  client: { x: 100, y: 340 }, // standalone
  appsync: { x: 310, y: 340 }, // inside AppSync zone
  parser: { x: 520, y: 340 }, // inside AppSync zone
  schema: { x: 420, y: 190 }, // inside AppSync zone
  vtl: { x: 720, y: 340 }, // inside AppSync zone
  userRes: { x: 950, y: 185 }, // inside Lambda zone
  postsRes: { x: 950, y: 340 }, // inside Lambda zone
  profileRes: { x: 950, y: 495 }, // inside Lambda zone
  dynamo: { x: 1170, y: 340 }, // inside Data zone
};

/* ── Boundary zones (25px padding around contained nodes) */
const ZONES = {
  appsyncManaged: {
    x: 205,
    y: 130,
    w: 620,
    h: 265,
    rx: 16,
    label: "AWS AppSync — Managed Service",
    labelX: 515,
    labelY: 144,
  },
  lambdaExec: {
    x: 845,
    y: 132,
    w: 210,
    h: 416,
    rx: 16,
    label: "Lambda Resolvers",
    labelX: 950,
    labelY: 146,
  },
  dataLayer: {
    x: 1075,
    y: 283,
    w: 190,
    h: 114,
    rx: 12,
    label: "Data Layer",
    labelX: 1170,
    labelY: 297,
  },
};

export const graphqlApproachAdapter: GraphqlAdapter = {
  id: "graphql-approach",

  profile: {
    label: "GraphQL (AWS AppSync)",
    description:
      "AWS AppSync exposes a single GraphQL endpoint. Cognito authenticates the request. The query is parsed and validated inside AppSync, then VTL/JS pipeline resolvers invoke Lambda functions that read only the requested fields from DynamoDB.",
  },

  colors: { fill: "#1e3a5f", stroke: "#e535ab" },

  computeMetrics(state: GraphqlState) {
    const p = state.phase;
    state.endpoints = p !== "overview" ? "single" : "none";
    state.schemaVisible = ["validate", "schema", "summary"].includes(p);
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
    return [
      {
        from: "client",
        to: "cognito",
        duration: 800,
        color: "#f59e0b",
        explain: "Client signs in with Cognito and receives a JWT",
      },
    ];
  },

  buildTopology(builder, state: GraphqlState, helpers) {
    const hot = helpers.hot;
    const p = helpers.phase;

    const isAuth = p === "auth";
    const isValidate = p === "validate";
    const isResolve = p === "resolve";
    const isResponse = p === "response";
    const isSummary = p === "summary";
    const isSchema = p === "schema";

    /* ── Boundary zone overlays ──────────────────────── */
    builder.overlay((o: any) => {
      /* AppSync Managed zone */
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

      /* Lambda Resolvers zone */
      o.add(
        "rect",
        {
          x: ZONES.lambdaExec.x,
          y: ZONES.lambdaExec.y,
          w: ZONES.lambdaExec.w,
          h: ZONES.lambdaExec.h,
          rx: ZONES.lambdaExec.rx,
          fill: "rgba(34, 197, 94, 0.04)",
          stroke: "rgba(34, 197, 94, 0.25)",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
          opacity: 1,
        },
        { key: "zone-lambda" },
      );
      o.add(
        "text",
        {
          x: ZONES.lambdaExec.labelX,
          y: ZONES.lambdaExec.labelY,
          text: ZONES.lambdaExec.label,
          fill: "rgba(34, 197, 94, 0.55)",
          fontSize: 10,
          fontWeight: "600",
        },
        { key: "zone-lambda-label" },
      );

      /* Data Layer zone */
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

    /* ── Client ─────────────────────────────────────── */
    builder
      .node("client")
      .at(POS.client.x, POS.client.y)
      .rect(140, 60, 12)
      .fill(hot("client") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client") ? "#e535ab" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Client App");
          l.newline();
          l.color("Amplify SDK", "#94a3b8", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    /* ── Cognito ────────────────────────────────────── */
    builder
      .node("cognito")
      .at(POS.cognito.x, POS.cognito.y)
      .rect(150, 56, 12)
      .fill(isAuth || hot("cognito") ? "#78350f" : "#0f172a")
      .stroke(isAuth || hot("cognito") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Amazon Cognito");
          l.newline();
          l.color(
            isAuth ? "✓ JWT verified" : "User Pool + JWT",
            isAuth ? "#fbbf24" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        {
          fill: isAuth ? "#fef3c7" : "#fff",
          fontSize: 11,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    /* ── AWS AppSync ────────────────────────────────── */
    builder
      .node("appsync")
      .at(POS.appsync.x, POS.appsync.y)
      .rect(160, 60, 12)
      .fill(hot("endpoint") || hot("appsync") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("endpoint") || hot("appsync") ? "#e535ab" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("AWS AppSync");
          l.newline();
          l.color("POST /graphql", "#f9a8d4", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ── Query Parser / Validator ───────────────────── */
    builder
      .node("parser")
      .at(POS.parser.x, POS.parser.y)
      .rect(160, 60, 12)
      .fill(isValidate ? "#4c1d95" : "#0f172a")
      .stroke(isValidate ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Parser / Validator");
          l.newline();
          l.color(
            isValidate ? "✓ AST validated" : "Query → AST",
            isValidate ? "#c4b5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        {
          fill: isValidate ? "#ede9fe" : "#fff",
          fontSize: 11,
          dy: -2,
          lineHeight: 1.6,
        },
      );

    /* ── AppSync Schema (SDL) ───────────────────────── */
    builder
      .node("schema")
      .at(POS.schema.x, POS.schema.y)
      .rect(160, 70, 12)
      .fill(
        state.schemaVisible || isValidate || isSchema ? "#3b0764" : "#0f172a",
      )
      .stroke(
        state.schemaVisible || isValidate || isSchema ? "#a855f7" : "#1e293b",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("Schema (SDL)");
          l.newline();
          l.color("type Query {", "#c084fc", { fontSize: 8 });
          l.newline();
          l.color("  user(id: ID!)", "#c084fc", { fontSize: 8 });
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

    /* ── Pipeline Resolver ──────────────────────────── */
    builder
      .node("vtl")
      .at(POS.vtl.x, POS.vtl.y)
      .rect(170, 70, 12)
      .fill(isResolve ? "#064e3b" : "#0f172a")
      .stroke(isResolve ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Pipeline Resolver");
          l.newline();
          l.color(
            isResolve ? "Fan-out → 3 functions" : "Orchestrator (no code)",
            isResolve ? "#86efac" : "#94a3b8",
            { fontSize: 8 },
          );
          l.newline();
          l.color(
            isResolve ? "VTL maps each field" : "1 query → N resolvers",
            isResolve ? "#6ee7b7" : "#64748b",
            { fontSize: 8 },
          );
        },
        {
          fill: isResolve ? "#dcfce7" : "#fff",
          fontSize: 11,
          dy: -6,
          lineHeight: 1.4,
        },
      );

    /* ── Lambda Resolvers (individual) ──────────────── */
    const resolvers = [
      {
        id: "userRes",
        pos: POS.userRes,
        name: "λ userResolver",
        field: "→ name",
        color: "#f472b6",
      },
      {
        id: "postsRes",
        pos: POS.postsRes,
        name: "λ postsResolver",
        field: "→ email",
        color: "#fb923c",
      },
      {
        id: "profileRes",
        pos: POS.profileRes,
        name: "λ profileResolver",
        field: "→ avatar",
        color: "#38bdf8",
      },
    ];

    resolvers.forEach((r) => {
      builder
        .node(r.id)
        .at(r.pos.x, r.pos.y)
        .rect(160, 56, 10)
        .fill(isResolve || isResponse ? "#052e16" : "#0f172a")
        .stroke(isResolve || isResponse ? r.color : "#334155", 2)
        .richLabel(
          (l: any) => {
            l.bold(r.name);
            l.newline();
            l.color(
              isResolve ? "Fetching…" : r.field,
              isResolve ? "#86efac" : "#94a3b8",
              { fontSize: 9 },
            );
          },
          {
            fill: isResolve ? "#dcfce7" : "#fff",
            fontSize: 10,
            dy: -2,
            lineHeight: 1.6,
          },
        );
    });

    /* ── DynamoDB ────────────────────────────────────── */
    builder
      .node("dynamo")
      .at(POS.dynamo.x, POS.dynamo.y)
      .rect(140, 64, 12)
      .fill(hot("database") || hot("dynamo") ? "#713f12" : "#0f172a")
      .stroke(hot("database") || hot("dynamo") ? "#eab308" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("DynamoDB");
          l.newline();
          l.color("NoSQL · on-demand", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    /* ── Edges ──────────────────────────────────────── */

    // Client → Cognito (auth — separate service)
    builder
      .edge("client", "cognito", "client-cognito")
      .stroke(isAuth || hot("cognito") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("sign-in", { fill: "#fbbf24", fontSize: 8 });

    // Client → AppSync (query + JWT in header)
    builder
      .edge("client", "appsync", "client-appsync")
      .stroke(hot("client") || hot("appsync") ? "#e535ab" : "#475569", 2)
      .arrow(true)
      .label(p === "request" ? "POST + Bearer JWT" : "query", {
        fill: "#e535ab",
        fontSize: 9,
      });

    // AppSync → Parser
    builder
      .edge("appsync", "parser", "appsync-parser")
      .stroke(isValidate || hot("endpoint") ? "#a78bfa" : "#475569", 2)
      .arrow(true);

    // Schema ↔ Parser (validation link)
    builder
      .edge("schema", "parser", "schema-parser")
      .stroke(isValidate || isSchema ? "#a855f7" : "#1e293b", 1)
      .dashed()
      .label(isValidate ? "validate" : "", { fill: "#c084fc", fontSize: 8 });

    // Parser → Pipeline Resolver
    builder
      .edge("parser", "vtl", "parser-vtl")
      .stroke(isResolve || isValidate ? "#22c55e" : "#475569", 2)
      .arrow(true);

    // Pipeline Resolver → each Lambda (labeled with field name)
    resolvers.forEach((r) => {
      builder
        .edge("vtl", r.id, `vtl-${r.id}`)
        .stroke(isResolve ? r.color : "#475569", 2)
        .arrow(true)
        .label(isResolve ? r.field.replace("→ ", "") : "", {
          fill: r.color,
          fontSize: 8,
        });
    });

    // Each Lambda → DynamoDB
    resolvers.forEach((r) => {
      builder
        .edge(r.id, "dynamo", `${r.id}-dynamo`)
        .stroke(isResolve || hot("database") ? "#eab308" : "#475569", 1)
        .arrow(true)
        .dashed();
    });

    /* ── Overlays ───────────────────────────────────── */

    // Query text on request step — below AppSync node
    if (p === "request" || p === "validate") {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.appsync.x - 15,
            y: POS.appsync.y + 68,
            w: 270,
            h: 28,
            rx: 6,
            fill: "#1e1b4b",
            stroke: "#6366f1",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "query-box" },
        );
        o.add(
          "text",
          {
            x: POS.appsync.x + 120,
            y: POS.appsync.y + 87,
            text: '{ user(id:"123") { name, email, avatar } }',
            fill: "#c7d2fe",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "query-text" },
        );
      });
    }

    // Auth annotation — JWT issued by Cognito, cached client-side
    if (isAuth) {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.cognito.x - 5,
            y: POS.cognito.y + 62,
            w: 165,
            h: 28,
            rx: 6,
            fill: "#451a03",
            stroke: "#f59e0b",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "auth-box" },
        );
        o.add(
          "text",
          {
            x: POS.cognito.x + 78,
            y: POS.cognito.y + 81,
            text: "← JWT token issued",
            fill: "#fbbf24",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "auth-text" },
        );
        o.add(
          "rect",
          {
            x: POS.client.x - 5,
            y: POS.client.y - 38,
            w: 155,
            h: 30,
            rx: 6,
            fill: "#451a03",
            stroke: "#f59e0b",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "jwt-cache-box" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 72,
            y: POS.client.y - 18,
            text: "JWT cached locally",
            fill: "#fbbf24",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "jwt-cache-text" },
        );
      });
    }

    // Request header annotation
    if (p === "request") {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.client.x + 80,
            y: POS.client.y - 42,
            w: 195,
            h: 24,
            rx: 5,
            fill: "#1e1b4b",
            stroke: "#e535ab",
            strokeWidth: 1,
            opacity: 0.92,
          },
          { key: "header-box" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 178,
            y: POS.client.y - 30,
            text: "Authorization: Bearer <JWT>",
            fill: "#f9a8d4",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "header-text" },
        );
      });
    }

    // Response annotation
    if (isResponse || isSummary) {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: POS.client.x - 5,
            y: POS.client.y + 45,
            w: 210,
            h: 44,
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
            x: POS.client.x + 100,
            y: POS.client.y + 62,
            text: "✓ Response: 3 fields",
            fill: "#86efac",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "resp-title" },
        );
        o.add(
          "text",
          {
            x: POS.client.x + 100,
            y: POS.client.y + 77,
            text: "{ name, email, avatar }",
            fill: "#6ee7b7",
            fontSize: 9,
          },
          { key: "resp-detail" },
        );
      });
    }

    // Pipeline Resolver annotation during resolve step
    if (isResolve) {
      builder.overlay((o: any) => {
        /* Explain the fan-out mechanism */
        o.add(
          "rect",
          {
            x: POS.vtl.x - 10,
            y: POS.vtl.y + 78,
            w: 192,
            h: 38,
            rx: 6,
            fill: "#052e16",
            stroke: "#22c55e",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "pipeline-explain-box" },
        );
        o.add(
          "text",
          {
            x: POS.vtl.x + 86,
            y: POS.vtl.y + 92,
            text: "No custom code needed",
            fill: "#86efac",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "pipeline-explain-1" },
        );
        o.add(
          "text",
          {
            x: POS.vtl.x + 86,
            y: POS.vtl.y + 105,
            text: "VTL templates route fields",
            fill: "#6ee7b7",
            fontSize: 8,
          },
          { key: "pipeline-explain-2" },
        );

        /* DynamoDB GetItem labels per resolver */
        o.add(
          "text",
          {
            x: POS.userRes.x + 80,
            y: POS.userRes.y + 42,
            text: "GetItem → name",
            fill: "#fde68a",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "ddb-user" },
        );
        o.add(
          "text",
          {
            x: POS.postsRes.x + 80,
            y: POS.postsRes.y + 42,
            text: "GetItem → email",
            fill: "#fde68a",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "ddb-posts" },
        );
        o.add(
          "text",
          {
            x: POS.profileRes.x + 80,
            y: POS.profileRes.y + 42,
            text: "GetItem → avatar",
            fill: "#fde68a",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "ddb-profile" },
        );
      });
    }
  },

  getStatBadges(state: GraphqlState) {
    return [
      {
        label: "Endpoints",
        value: state.endpoints === "single" ? "1" : "—",
        color: "#e535ab",
      },
      {
        label: "Fetching",
        value: state.fetchStrategy === "exact" ? "Exact" : "—",
        color: "#86efac",
      },
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
