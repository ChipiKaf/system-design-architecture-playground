import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

const POS = {
  request: { x: 100, y: 200 },
  serverComp: { x: 340, y: 80 },
  fetchCall: { x: 340, y: 330 },
  dataReady: { x: 580, y: 200 },
  render: { x: 780, y: 200 },
};

export const dataFetchingAdapter: NextjsAdapter = {
  id: "data-fetching",

  profile: {
    label: "Server-Side Fetching",
    description:
      "Fetch data directly in Server Components with async/await — no useEffect, no loading spinners, no client waterfalls. Data is ready before the user sees the page.",
  },

  colors: { fill: "#78350f", stroke: "#f59e0b" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.dataFetched = active;
    state.htmlSent = active;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "request",
        to: "server-comp",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Request hits the server. The page component is an async Server Component — it can await data directly.",
      },
      {
        from: "server-comp",
        to: "fetch-call",
        duration: 600,
        color: "#f59e0b",
        explain:
          "Inside the component: `const posts = await fetch('https://api...')`. This runs on the server, not in the browser.",
      },
      {
        from: "fetch-call",
        to: "data-ready",
        duration: 600,
        color: "#f59e0b",
        explain:
          'Data returns. Unlike useEffect, this happens before any HTML is sent — no "loading → fetch → re-render" waterfall.',
      },
      {
        from: "data-ready",
        to: "render",
        duration: 500,
        color: "#4ade80",
        explain:
          "The component renders with data already in hand. The browser receives a complete page — not an empty shell that fetches later.",
      },
    ];
  },

  getStepLabels() {
    return ["Incoming Request", "Call fetch()", "Data Ready", "Render Output"];
  },

  buildTopology(builder: any, _state: NextjsState, helpers) {
    const hot = helpers.hot;

    builder
      .node("request")
      .at(POS.request.x, POS.request.y)
      .rect(160, 56, 12)
      .fill(hot("request") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("request") ? "#60a5fa" : "#334155", 2)
      .label("Request", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("server-comp")
      .at(POS.serverComp.x, POS.serverComp.y)
      .rect(190, 56, 12)
      .fill(hot("server-comp") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("server-comp") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("async function Page()");
          l.newline();
          l.color("Server Component", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("fetch-call")
      .at(POS.fetchCall.x, POS.fetchCall.y)
      .rect(190, 56, 12)
      .fill(hot("fetch-call") ? "#78350f" : "#0f172a")
      .stroke(hot("fetch-call") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("await fetch(url)");
          l.newline();
          l.color("DB, API, or ORM call", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("data-ready")
      .at(POS.dataReady.x, POS.dataReady.y)
      .rect(160, 56, 12)
      .fill(hot("data-ready") ? "#164e63" : "#0f172a")
      .stroke(hot("data-ready") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Data Ready");
          l.newline();
          l.color("no client waterfall", "#67e8f9", { fontSize: 9 });
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
          l.bold("Complete Page");
          l.newline();
          l.color("HTML with data included", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder.edge("request", "server-comp", "e-req-sc").stroke("#60a5fa", 1.4);
    builder
      .edge("server-comp", "fetch-call", "e-sc-fetch")
      .stroke("#f59e0b", 1.4);
    builder
      .edge("fetch-call", "data-ready", "e-fetch-data")
      .stroke("#f59e0b", 1.4);
    builder
      .edge("data-ready", "render", "e-data-render")
      .stroke("#4ade80", 1.4);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Pattern", value: "Server Fetch", color: "#f59e0b" },
      {
        label: "Data",
        value: state.dataFetched ? "Ready" : "—",
        color: "#4ade80",
      },
      {
        label: "Waterfall",
        value: state.dataFetched ? "None" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.dataFetched = false;
    state.htmlSent = false;
  },
};
