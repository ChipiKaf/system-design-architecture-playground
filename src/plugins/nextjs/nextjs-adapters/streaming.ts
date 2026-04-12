import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

const POS = {
  request: { x: 100, y: 200 },
  server: { x: 320, y: 80 },
  shell: { x: 570, y: 80 },
  slowData: { x: 320, y: 330 },
  chunk: { x: 570, y: 330 },
  browser: { x: 770, y: 200 },
};

export const streamingAdapter: NextjsAdapter = {
  id: "streaming",

  profile: {
    label: "Streaming",
    description:
      "The page is sent in chunks as parts become ready — drinks first, starter next, main course when ready. Uses loading.tsx for temporary placeholders.",
  },

  colors: { fill: "#4c1d95", stroke: "#a78bfa" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.renderMode = active ? "streaming" : "none";
    state.htmlSent = active;
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
        color: "#a78bfa",
        explain:
          "Request arrives. Next.js starts rendering the route — but it won't wait for everything.",
      },
      {
        from: "server",
        to: "shell",
        duration: 500,
        color: "#4ade80",
        explain:
          "The shell (layout + loading.tsx fallback) is ready immediately. This chunk is sent to the browser first.",
      },
      {
        from: "shell",
        to: "browser",
        duration: 500,
        color: "#4ade80",
        explain:
          "The browser shows the shell + loading spinner. The user sees something useful right away.",
      },
      {
        from: "server",
        to: "slow-data",
        duration: 700,
        color: "#f59e0b",
        explain:
          "Meanwhile, a slow data fetch continues on the server — a Suspense boundary wraps this part.",
      },
      {
        from: "slow-data",
        to: "chunk",
        duration: 500,
        color: "#22d3ee",
        explain:
          "When the data resolves, Next.js renders that component and streams the HTML chunk to the browser.",
      },
      {
        from: "chunk",
        to: "browser",
        duration: 400,
        color: "#22d3ee",
        explain:
          "The browser replaces the loading fallback with real content. No full page reload needed.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Incoming Request",
      "Render Shell",
      "Shell to Browser",
      "Fetch Slow Data",
      "Build Chunk",
      "Stream Chunk",
    ];
  },

  buildTopology(builder: any, _state: NextjsState, helpers) {
    const hot = helpers.hot;

    builder
      .node("request")
      .at(POS.request.x, POS.request.y)
      .rect(150, 56, 12)
      .fill(hot("request") ? "#4c1d95" : "#0f172a")
      .stroke(hot("request") ? "#a78bfa" : "#334155", 2)
      .label("Request", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("server")
      .at(POS.server.x, POS.server.y)
      .rect(170, 56, 12)
      .fill(hot("server") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("server") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Server");
          l.newline();
          l.color("start rendering…", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("shell")
      .at(POS.shell.x, POS.shell.y)
      .rect(170, 56, 12)
      .fill(hot("shell") ? "#14532d" : "#0f172a")
      .stroke(hot("shell") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Shell + loading.tsx");
          l.newline();
          l.color("sent immediately", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("slow-data")
      .at(POS.slowData.x, POS.slowData.y)
      .rect(170, 56, 12)
      .fill(hot("slow-data") ? "#78350f" : "#0f172a")
      .stroke(hot("slow-data") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Slow Fetch");
          l.newline();
          l.color("Suspense boundary", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("chunk")
      .at(POS.chunk.x, POS.chunk.y)
      .rect(170, 56, 12)
      .fill(hot("chunk") ? "#164e63" : "#0f172a")
      .stroke(hot("chunk") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("HTML Chunk");
          l.newline();
          l.color("streamed when ready", "#67e8f9", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("browser")
      .at(POS.browser.x, POS.browser.y)
      .rect(150, 56, 12)
      .fill(hot("browser") ? "#78350f" : "#0f172a")
      .stroke(hot("browser") ? "#fbbf24" : "#334155", 2)
      .label("Browser", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder.edge("request", "server", "e-req-srv").stroke("#a78bfa", 1.4);
    builder.edge("server", "shell", "e-srv-shell").stroke("#4ade80", 1.4);
    builder.edge("shell", "browser", "e-shell-browser").stroke("#4ade80", 1.4);
    builder.edge("server", "slow-data", "e-srv-slow").stroke("#f59e0b", 1.4);
    builder.edge("slow-data", "chunk", "e-slow-chunk").stroke("#22d3ee", 1.4);
    builder
      .edge("chunk", "browser", "e-chunk-browser")
      .stroke("#22d3ee", 1.2)
      .dashed();
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Mode", value: "Streaming", color: "#a78bfa" },
      {
        label: "Shell",
        value: state.htmlSent ? "Sent" : "—",
        color: "#4ade80",
      },
      {
        label: "Chunks",
        value: state.jsLoaded ? "Complete" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.renderMode = "none";
    state.htmlSent = false;
    state.jsLoaded = false;
  },
};
