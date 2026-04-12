import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

const POS = {
  request: { x: 130, y: 120 },
  server: { x: 400, y: 120 },
  dataSource: { x: 400, y: 280 },
  render: { x: 670, y: 120 },
  browser: { x: 670, y: 280 },
  user: { x: 670, y: 420 },
};

export const dynamicRenderingAdapter: NextjsAdapter = {
  id: "dynamic-rendering",

  profile: {
    label: "Dynamic Rendering",
    description:
      "Pages are rendered on the server at request time — fresh data every time. Best for user-specific or time-sensitive content.",
  },

  colors: { fill: "#1e3a5f", stroke: "#60a5fa" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.renderMode = active ? "dynamic" : "none";
    state.htmlSent = active;
    state.dataFetched = active;
    state.jsLoaded = state.phase === "summary";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "request",
        to: "server",
        duration: 500,
        color: "#60a5fa",
        explain:
          "A request arrives at /dashboard. Next.js routes it to the matching page file on the server.",
      },
      {
        from: "server",
        to: "data-source",
        duration: 600,
        color: "#f59e0b",
        explain:
          "The Server Component fetches fresh data — database, API, or ORM call. This happens on every request.",
      },
      {
        from: "data-source",
        to: "server",
        duration: 500,
        color: "#f59e0b",
        explain:
          "Data returns to the server. The component now has everything it needs to render.",
      },
      {
        from: "server",
        to: "render",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Next.js renders the component tree into HTML + RSC payload. Think: the kitchen cooks your meal fresh.",
      },
      {
        from: "render",
        to: "browser",
        duration: 500,
        color: "#22d3ee",
        explain:
          "HTML and JS bundles are sent to the browser. The user sees content immediately.",
      },
      {
        from: "browser",
        to: "user",
        duration: 400,
        color: "#a78bfa",
        explain:
          "React hydrates client components — the page becomes interactive with fresh, request-time data.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Incoming Request",
      "Query Data Source",
      "Return Data",
      "Render HTML",
      "Send to Browser",
      "Page Interactive",
    ];
  },

  buildTopology(builder: any, state: NextjsState, helpers) {
    const hot = helpers.hot;

    builder
      .node("request")
      .at(POS.request.x, POS.request.y)
      .rect(160, 56, 12)
      .fill(hot("request") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("request") ? "#60a5fa" : "#334155", 2)
      .label("GET /dashboard", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    builder
      .node("server")
      .at(POS.server.x, POS.server.y)
      .rect(180, 56, 12)
      .fill(hot("server") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("server") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Next.js Server");
          l.newline();
          l.color("render at request time", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("data-source")
      .at(POS.dataSource.x, POS.dataSource.y)
      .rect(180, 56, 12)
      .fill(hot("data-source") ? "#78350f" : "#0f172a")
      .stroke(hot("data-source") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Database / API");
          l.newline();
          l.color("fresh data per request", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("render")
      .at(POS.render.x, POS.render.y)
      .rect(160, 56, 12)
      .fill(hot("render") ? "#14532d" : "#0f172a")
      .stroke(hot("render") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("HTML + RSC");
          l.newline();
          l.color("server-rendered output", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("browser")
      .at(POS.browser.x, POS.browser.y)
      .rect(160, 56, 12)
      .fill(hot("browser") ? "#78350f" : "#0f172a")
      .stroke(hot("browser") ? "#fbbf24" : "#334155", 2)
      .label("Browser", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("user")
      .at(POS.user.x, POS.user.y)
      .rect(140, 56, 12)
      .fill(hot("user") ? "#4c1d95" : "#0f172a")
      .stroke(hot("user") ? "#a78bfa" : "#334155", 2)
      .label("User", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder.edge("request", "server", "e-req-srv").stroke("#60a5fa", 1.4);
    builder.edge("server", "data-source", "e-srv-db").stroke("#f59e0b", 1.4);
    builder
      .edge("data-source", "server", "e-db-srv")
      .stroke("#f59e0b", 1.2)
      .dashed();
    builder.edge("server", "render", "e-srv-render").stroke("#60a5fa", 1.4);
    builder
      .edge("render", "browser", "e-render-browser")
      .stroke("#22d3ee", 1.4);
    builder.edge("browser", "user", "e-browser-user").stroke("#a78bfa", 1.2);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Mode", value: "Dynamic", color: "#60a5fa" },
      {
        label: "Data",
        value: state.dataFetched ? "Fresh" : "—",
        color: "#f59e0b",
      },
      {
        label: "Hydrated",
        value: state.jsLoaded ? "Yes" : "—",
        color: "#a78bfa",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.renderMode = "none";
    state.htmlSent = false;
    state.dataFetched = false;
    state.jsLoaded = false;
  },
};
