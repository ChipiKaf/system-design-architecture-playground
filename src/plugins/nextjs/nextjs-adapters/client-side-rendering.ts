import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

/* ══════════════════════════════════════════════════════════
   Client-Side Rendering (CSR)

   The "classic React" model. The server ships an empty shell,
   then JS builds everything in the user's browser.

   Row 1  SERVE      server → browser → js-load → react-boot
   Row 2  RENDER     first-paint → data-fetch → api → final-render

   Contrast with Static Rendering:
   - Static: real HTML arrives → user sees content immediately
   - CSR:    empty <div> arrives → user stares at white screen
             until JS downloads, executes, and renders
   ══════════════════════════════════════════════════════════ */

/* ── Positions ───────────────────────────────────────── */
const POS = {
  /* Row 1 — Serve (rose) */
  server: { x: 60, y: 80 },
  browser: { x: 280, y: 80 },
  jsLoad: { x: 500, y: 80 },
  reactBoot: { x: 720, y: 80 },
  /* Row 2 — Render + Data (amber → blue) */
  firstPaint: { x: 60, y: 230 },
  dataFetch: { x: 280, y: 230 },
  api: { x: 500, y: 230 },
  finalRender: { x: 720, y: 230 },
};

export const clientSideRenderingAdapter: NextjsAdapter = {
  id: "client-side-rendering",

  profile: {
    label: "Client-Side Rendering",
    description:
      "The server sends an empty HTML shell. JavaScript downloads, executes, and builds the entire UI in the user's browser. The opposite of static rendering.",
  },

  colors: { fill: "#881337", stroke: "#fb7185" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.renderMode = active ? "client" : "none";
    state.htmlSent = false; // CSR never sends real HTML
    state.dataFetched = active;
    state.jsLoaded = state.phase === "summary";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      /* ── Phase 1: Serve (empty shell) ── */
      {
        from: "server",
        to: "browser",
        duration: 450,
        color: "#fb7185",
        explain:
          'Server sends index.html — but it\'s nearly empty: <html><body><div id="root"></div><script src="bundle.js"></script></body></html>. No headings, no text, no data. The user sees a blank white page.',
      },
      {
        from: "browser",
        to: "js-load",
        duration: 600,
        color: "#fb7185",
        explain:
          "The browser downloads the JS bundle. This is BIG — it contains React, your components, router, state library, everything. On a slow connection? Long white screen.",
      },
      {
        from: "js-load",
        to: "react-boot",
        duration: 550,
        color: "#fb7185",
        explain:
          "JavaScript executes. React calls createRoot(document.getElementById('root')) and starts building your component tree from scratch. All of this runs on the user's machine — not a server.",
      },
      /* ── Phase 2: Render + Data ── */
      {
        from: "react-boot",
        to: "first-paint",
        duration: 500,
        color: "#fbbf24",
        explain:
          "React inserts DOM nodes. The user sees UI for the first time — headings, buttons, layout appear. But data-dependent sections show loading spinners or skeleton screens.",
      },
      {
        from: "first-paint",
        to: "data-fetch",
        duration: 450,
        color: "#fbbf24",
        explain:
          "useEffect hooks fire. Components that need data call fetch('/api/...'). These are brand new HTTP requests from the browser — a second round trip after the initial page load.",
      },
      {
        from: "data-fetch",
        to: "api",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Requests travel to your backend API. The browser is the orchestrator — it decides what to fetch, when, and how. No server pre-rendered this content.",
      },
      {
        from: "api",
        to: "final-render",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Data returns. React re-renders affected components — spinners replaced with real content. The page is finally complete. Total: 3+ round trips before the user sees everything.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Empty HTML Arrives",
      "Download JS Bundle",
      "React Initializes",
      "First Paint (Skeleton)",
      "Fire useEffect Fetches",
      "Hit Backend API",
      "Re-render with Data",
    ];
  },

  buildTopology(builder: any, _state: NextjsState, helpers) {
    const hot = helpers.hot;

    /* ════ Row 1: Serve phase (rose) ════ */
    builder
      .node("server")
      .at(POS.server.x, POS.server.y)
      .rect(160, 54, 12)
      .fill(hot("server") ? "#881337" : "#0f172a")
      .stroke(hot("server") ? "#fb7185" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Origin Server");
          l.newline();
          l.color("serves index.html", "#fda4af", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("browser")
      .at(POS.browser.x, POS.browser.y)
      .rect(160, 54, 12)
      .fill(hot("browser") ? "#881337" : "#0f172a")
      .stroke(hot("browser") ? "#fb7185" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Browser");
          l.newline();
          l.color('<div id="root"></div>', "#fda4af", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("js-load")
      .at(POS.jsLoad.x, POS.jsLoad.y)
      .rect(160, 54, 12)
      .fill(hot("js-load") ? "#881337" : "#0f172a")
      .stroke(hot("js-load") ? "#fb7185" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("JS Bundle");
          l.newline();
          l.color("React + App + Router", "#fda4af", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("react-boot")
      .at(POS.reactBoot.x, POS.reactBoot.y)
      .rect(160, 54, 12)
      .fill(hot("react-boot") ? "#881337" : "#0f172a")
      .stroke(hot("react-boot") ? "#fb7185" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("React Boots");
          l.newline();
          l.color("createRoot() in browser", "#fda4af", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ════ Row 2: Render + Data (amber → blue) ════ */
    builder
      .node("first-paint")
      .at(POS.firstPaint.x, POS.firstPaint.y)
      .rect(160, 54, 12)
      .fill(hot("first-paint") ? "#78350f" : "#0f172a")
      .stroke(hot("first-paint") ? "#fbbf24" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("First Paint");
          l.newline();
          l.color("skeleton / spinners", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("data-fetch")
      .at(POS.dataFetch.x, POS.dataFetch.y)
      .rect(160, 54, 12)
      .fill(hot("data-fetch") ? "#78350f" : "#0f172a")
      .stroke(hot("data-fetch") ? "#fbbf24" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("useEffect Fetch");
          l.newline();
          l.color("fetch('/api/...')", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("api")
      .at(POS.api.x, POS.api.y)
      .rect(160, 54, 12)
      .fill(hot("api") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("api") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Backend API");
          l.newline();
          l.color("database / service", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("final-render")
      .at(POS.finalRender.x, POS.finalRender.y)
      .rect(160, 54, 12)
      .fill(hot("final-render") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("final-render") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Final Render");
          l.newline();
          l.color("content replaces spinners", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ── Edges ── */
    /* Serve phase (rose) */
    builder.edge("server", "browser", "e-srv-browser").stroke("#fb7185", 1.4);
    builder.edge("browser", "js-load", "e-browser-js").stroke("#fb7185", 1.4);
    builder.edge("js-load", "react-boot", "e-js-react").stroke("#fb7185", 1.4);
    /* Render phase (amber) */
    builder
      .edge("react-boot", "first-paint", "e-react-paint")
      .stroke("#fbbf24", 1.4);
    builder
      .edge("first-paint", "data-fetch", "e-paint-fetch")
      .stroke("#fbbf24", 1.4);
    /* Data phase (blue) */
    builder.edge("data-fetch", "api", "e-fetch-api").stroke("#60a5fa", 1.4);
    builder.edge("api", "final-render", "e-api-render").stroke("#60a5fa", 1.4);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Mode", value: "CSR", color: "#fb7185" },
      {
        label: "HTML",
        value: "Empty Shell",
        color: "#fda4af",
      },
      {
        label: "JS Loaded",
        value: state.jsLoaded ? "Yes" : "—",
        color: "#fbbf24",
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
