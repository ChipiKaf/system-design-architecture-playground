import type { GraphqlAdapter } from "./types";
import type { GraphqlState } from "../graphqlSlice";

/* ── Node positions (canvas 1300×700) ────────────────── */
const POS = {
  cognito: { x: 100, y: 80 }, // standalone — separate service
  client: { x: 100, y: 340 }, // standalone
  apigw: { x: 300, y: 340 }, // inside API GW zone
  usersEp: { x: 510, y: 155 }, // inside API GW zone
  postsEp: { x: 510, y: 340 }, // inside API GW zone
  profileEp: { x: 510, y: 525 }, // inside API GW zone
  usersLam: { x: 750, y: 155 }, // inside Lambda zone
  postsLam: { x: 750, y: 340 }, // inside Lambda zone
  profileLam: { x: 750, y: 525 }, // inside Lambda zone
  rds: { x: 980, y: 340 }, // inside Data zone
  response: { x: 1170, y: 340 }, // standalone
};

/* ── Boundary zones (25px padding around contained nodes) */
const ZONES = {
  apiGateway: {
    x: 195,
    y: 105,
    w: 425,
    h: 470,
    rx: 16,
    label: "AWS API Gateway",
    labelX: 407,
    labelY: 119,
  },
  lambdaExec: {
    x: 640,
    y: 102,
    w: 220,
    h: 476,
    rx: 16,
    label: "Lambda Functions",
    labelX: 750,
    labelY: 116,
  },
  dataLayer: {
    x: 885,
    y: 283,
    w: 190,
    h: 114,
    rx: 12,
    label: "Data Layer",
    labelX: 980,
    labelY: 297,
  },
};

export const restApproachAdapter: GraphqlAdapter = {
  id: "rest-approach",

  profile: {
    label: "REST (API Gateway + Lambda)",
    description:
      "AWS API Gateway exposes separate REST endpoints behind Cognito authentication. Each route triggers its own Lambda function that queries RDS, returning fixed response shapes — often more data than the client needs.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  computeMetrics(state: GraphqlState) {
    const p = state.phase;
    state.endpoints = p !== "overview" ? "multiple" : "none";
    state.schemaVisible = ["schema", "summary"].includes(p);
    state.roundTrips = ["response", "summary"].includes(p) ? 3 : 0;
    state.responseFields = ["response", "summary"].includes(p) ? 12 : 0;
    state.fetchStrategy = ["response", "summary"].includes(p) ? "over" : "none";
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
    const isResolve = p === "resolve";
    const isResponse = p === "response";
    const isSummary = p === "summary";
    const isSchema = p === "schema";
    const isValidate = p === "validate";

    /* ── Boundary zone overlays ──────────────────────── */
    builder.overlay((o: any) => {
      /* API Gateway zone */
      o.add(
        "rect",
        {
          x: ZONES.apiGateway.x,
          y: ZONES.apiGateway.y,
          w: ZONES.apiGateway.w,
          h: ZONES.apiGateway.h,
          rx: ZONES.apiGateway.rx,
          fill: "rgba(59, 130, 246, 0.04)",
          stroke: "rgba(59, 130, 246, 0.25)",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
          opacity: 1,
        },
        { key: "zone-apigw" },
      );
      o.add(
        "text",
        {
          x: ZONES.apiGateway.labelX,
          y: ZONES.apiGateway.labelY,
          text: ZONES.apiGateway.label,
          fill: "rgba(59, 130, 246, 0.55)",
          fontSize: 10,
          fontWeight: "600",
        },
        { key: "zone-apigw-label" },
      );

      /* Lambda Functions zone */
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
      .stroke(hot("client") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Client App");
          l.newline();
          l.color("3 separate requests", "#93c5fd", { fontSize: 9 });
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
            isAuth ? "✓ JWT verified" : "Authorizer",
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

    /* ── API Gateway ────────────────────────────────── */
    builder
      .node("apigw")
      .at(POS.apigw.x, POS.apigw.y)
      .rect(160, 60, 12)
      .fill(hot("endpoint") || hot("apigw") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("endpoint") || hot("apigw") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("API Gateway");
          l.newline();
          l.color("REST · 3 routes", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ── REST route resources ───────────────────────── */
    const routes = [
      {
        id: "usersEp",
        pos: POS.usersEp,
        path: "/users/{id}",
        fields: "6 fields",
        color: "#60a5fa",
      },
      {
        id: "postsEp",
        pos: POS.postsEp,
        path: "/posts?userId=",
        fields: "4 fields",
        color: "#60a5fa",
      },
      {
        id: "profileEp",
        pos: POS.profileEp,
        path: "/profile/{id}",
        fields: "2 fields",
        color: "#60a5fa",
      },
    ];

    routes.forEach((ep) => {
      builder
        .node(ep.id)
        .at(ep.pos.x, ep.pos.y)
        .rect(170, 50, 10)
        .fill(hot("endpoint") || hot(ep.id) ? "#1e3a5f" : "#0f172a")
        .stroke(hot("endpoint") || hot(ep.id) ? "#3b82f6" : "#334155", 2)
        .richLabel(
          (l: any) => {
            l.code(ep.path);
            l.newline();
            l.color(`GET → ${ep.fields}`, "#93c5fd", { fontSize: 8 });
          },
          { fill: "#fff", fontSize: 10, dy: -2, lineHeight: 1.6 },
        );
    });

    /* ── Lambda functions (individual) ──────────────── */
    const lambdas = [
      {
        id: "usersLam",
        pos: POS.usersLam,
        name: "λ getUser",
        detail: "SELECT *",
        color: "#34d399",
      },
      {
        id: "postsLam",
        pos: POS.postsLam,
        name: "λ getPosts",
        detail: "SELECT *",
        color: "#34d399",
      },
      {
        id: "profileLam",
        pos: POS.profileLam,
        name: "λ getProfile",
        detail: "SELECT *",
        color: "#34d399",
      },
    ];

    lambdas.forEach((fn) => {
      builder
        .node(fn.id)
        .at(fn.pos.x, fn.pos.y)
        .rect(170, 55, 10)
        .fill(isResolve || isValidate ? "#064e3b" : "#0f172a")
        .stroke(isResolve || isValidate ? fn.color : "#334155", 2)
        .richLabel(
          (l: any) => {
            l.bold(fn.name);
            l.newline();
            l.color(
              isResolve ? fn.detail : "Fixed response",
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

    /* ── Amazon RDS ─────────────────────────────────── */
    builder
      .node("rds")
      .at(POS.rds.x, POS.rds.y)
      .rect(140, 64, 12)
      .fill(hot("database") || hot("rds") ? "#713f12" : "#0f172a")
      .stroke(hot("database") || hot("rds") ? "#eab308" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Amazon RDS");
          l.newline();
          l.color("PostgreSQL", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    /* ── Client Aggregation ─────────────────────────── */
    builder
      .node("response")
      .at(POS.response.x, POS.response.y)
      .rect(130, 70, 12)
      .fill(isResponse || isSummary ? "#7f1d1d" : "#0f172a")
      .stroke(isResponse || isSummary ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Aggregation");
          l.newline();
          l.color(
            isResponse || isSummary ? "12 fields total" : "Merge responses",
            isResponse || isSummary ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
          l.newline();
          l.color(isResponse || isSummary ? "⚠ Only 3 used" : "", "#fbbf24", {
            fontSize: 9,
          });
        },
        {
          fill: isResponse || isSummary ? "#fecaca" : "#fff",
          fontSize: 11,
          dy: -6,
          lineHeight: 1.5,
        },
      );

    /* ── Edges ──────────────────────────────────────── */

    // Client → Cognito (auth — separate service)
    builder
      .edge("client", "cognito", "client-cognito")
      .stroke(isAuth || hot("cognito") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("sign-in", { fill: "#fbbf24", fontSize: 8 });

    // Client → API Gateway (requests + JWT in header)
    builder
      .edge("client", "apigw", "client-apigw")
      .stroke(hot("client") || hot("apigw") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label(p === "request" ? "HTTPS + Bearer JWT" : "HTTPS", {
        fill: "#93c5fd",
        fontSize: 8,
      });

    // API Gateway → each route
    routes.forEach((ep, i) => {
      builder
        .edge("apigw", ep.id, `apigw-${ep.id}`)
        .stroke(hot("endpoint") || hot("apigw") ? "#3b82f6" : "#475569", 2)
        .arrow(true)
        .label(`#${i + 1}`, { fill: "#93c5fd", fontSize: 8 });
    });

    // Route → Lambda
    routes.forEach((ep, i) => {
      builder
        .edge(ep.id, lambdas[i].id, `${ep.id}-lam`)
        .stroke(isResolve || isValidate ? "#34d399" : "#475569", 1)
        .arrow(true);
    });

    // Lambda → RDS
    lambdas.forEach((fn) => {
      builder
        .edge(fn.id, "rds", `${fn.id}-rds`)
        .stroke(isResolve || hot("database") ? "#eab308" : "#475569", 1)
        .arrow(true)
        .dashed();
    });

    // RDS → Response
    builder
      .edge("rds", "response", "rds-response")
      .stroke(isResponse || isSummary ? "#f87171" : "#475569", 2)
      .arrow(true)
      .label(isResponse ? "full rows" : "", { fill: "#fca5a5", fontSize: 8 });

    /* ── Overlays ───────────────────────────────────── */

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
            fill: "#172554",
            stroke: "#3b82f6",
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
            fill: "#93c5fd",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: "header-text" },
        );
      });
    }

    /* ── No schema — overlay on schema step ─────────── */
    if (isSchema || isSummary) {
      builder.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: 270,
            y: 610,
            w: 380,
            h: 36,
            rx: 8,
            fill: "#1e293b",
            stroke: "#475569",
            strokeWidth: 1,
            opacity: 0.95,
          },
          { key: "schema-box" },
        );
        o.add(
          "text",
          {
            x: 460,
            y: 633,
            text: "⚠ No type contract — relies on OpenAPI / docs",
            fill: "#fbbf24",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "schema-note" },
        );
      });
    }

    /* ── Over-fetching annotations ──────────────────── */
    if (isResponse || isSummary) {
      builder.overlay((o: any) => {
        const waste = [
          {
            x: POS.usersLam.x + 85,
            y: POS.usersLam.y + 42,
            text: "6 → 1 used",
          },
          {
            x: POS.postsLam.x + 85,
            y: POS.postsLam.y + 42,
            text: "4 → 1 used",
          },
          {
            x: POS.profileLam.x + 85,
            y: POS.profileLam.y + 42,
            text: "2 → 1 used",
          },
        ];
        waste.forEach((w, i) => {
          o.add(
            "text",
            {
              x: w.x,
              y: w.y,
              text: `⚠ ${w.text}`,
              fill: "#fbbf24",
              fontSize: 8,
              fontWeight: "bold",
            },
            { key: `waste-${i}` },
          );
        });
      });
    }
  },

  getStatBadges(state: GraphqlState) {
    return [
      {
        label: "Endpoints",
        value: state.endpoints === "multiple" ? "3" : "—",
        color: "#3b82f6",
      },
      {
        label: "Fetching",
        value: state.fetchStrategy === "over" ? "Over ⚠" : "—",
        color: "#fbbf24",
      },
      {
        label: "Round trips",
        value: state.roundTrips > 0 ? String(state.roundTrips) : "—",
        color: "#f87171",
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
