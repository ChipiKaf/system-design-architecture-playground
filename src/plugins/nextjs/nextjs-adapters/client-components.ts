import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

const POS = {
  server: { x: 100, y: 200 },
  html: { x: 320, y: 80 },
  jsBundle: { x: 320, y: 330 },
  browser: { x: 560, y: 200 },
  hydration: { x: 760, y: 80 },
  interactive: { x: 760, y: 330 },
};

export const clientComponentsAdapter: NextjsAdapter = {
  id: "client-components",

  profile: {
    label: "Client Components",
    description:
      "'use client' — components that run in the browser with useState, useEffect, clicks, and browser APIs. The interactive islands in your page.",
  },

  colors: { fill: "#78350f", stroke: "#fbbf24" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.componentType = active ? "client" : "none";
    state.bundleSplit = active;
    state.hydrated = state.phase === "summary";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "server",
        to: "html",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Even Client Components are pre-rendered on the server first — the user gets HTML before JavaScript loads.",
      },
      {
        from: "server",
        to: "js-bundle",
        duration: 500,
        color: "#fbbf24",
        explain:
          "'use client' marks a boundary. The bundler includes this component's code in the client-side JavaScript bundle.",
      },
      {
        from: "html",
        to: "browser",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Pre-rendered HTML arrives. The page is visible but not yet interactive — like a car body without an engine.",
      },
      {
        from: "js-bundle",
        to: "browser",
        duration: 600,
        color: "#fbbf24",
        explain:
          "The JS bundle downloads in parallel. It contains useState, useEffect, event handlers — all the interactive logic.",
      },
      {
        from: "browser",
        to: "hydration",
        duration: 500,
        color: "#a78bfa",
        explain:
          "Hydration: React walks the existing HTML and attaches event handlers. The engine gets connected to the car body.",
      },
      {
        from: "hydration",
        to: "interactive",
        duration: 400,
        color: "#4ade80",
        explain:
          "The component is now fully interactive — clicks work, state updates, animations play. Finished at the table.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Send HTML Shell",
      "Send JS Bundle",
      "HTML Arrives",
      "JS Bundle Arrives",
      "Hydrate Components",
      "Page Interactive",
    ];
  },

  buildTopology(builder: any, _state: NextjsState, helpers) {
    const hot = helpers.hot;

    builder
      .node("server")
      .at(POS.server.x, POS.server.y)
      .rect(160, 56, 12)
      .fill(hot("server") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("server") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Server Pre-render");
          l.newline();
          l.color("initial HTML pass", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("html")
      .at(POS.html.x, POS.html.y)
      .rect(170, 56, 12)
      .fill(hot("html") ? "#14532d" : "#0f172a")
      .stroke(hot("html") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("HTML (non-interactive)");
          l.newline();
          l.color("visible but static", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("js-bundle")
      .at(POS.jsBundle.x, POS.jsBundle.y)
      .rect(170, 56, 12)
      .fill(hot("js-bundle") ? "#78350f" : "#0f172a")
      .stroke(hot("js-bundle") ? "#fbbf24" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("JS Bundle");
          l.newline();
          l.color("'use client' code", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("browser")
      .at(POS.browser.x, POS.browser.y)
      .rect(160, 56, 12)
      .fill(hot("browser") ? "#164e63" : "#0f172a")
      .stroke(hot("browser") ? "#22d3ee" : "#334155", 2)
      .label("Browser", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("hydration")
      .at(POS.hydration.x, POS.hydration.y)
      .rect(160, 56, 12)
      .fill(hot("hydration") ? "#4c1d95" : "#0f172a")
      .stroke(hot("hydration") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Hydration");
          l.newline();
          l.color("attach event handlers", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("interactive")
      .at(POS.interactive.x, POS.interactive.y)
      .rect(160, 56, 12)
      .fill(hot("interactive") ? "#14532d" : "#0f172a")
      .stroke(hot("interactive") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Interactive ✓");
          l.newline();
          l.color("clicks, state, effects", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder.edge("server", "html", "e-srv-html").stroke("#60a5fa", 1.4);
    builder.edge("server", "js-bundle", "e-srv-js").stroke("#fbbf24", 1.4);
    builder.edge("html", "browser", "e-html-browser").stroke("#4ade80", 1.4);
    builder.edge("js-bundle", "browser", "e-js-browser").stroke("#fbbf24", 1.4);
    builder
      .edge("browser", "hydration", "e-browser-hydrate")
      .stroke("#a78bfa", 1.4);
    builder
      .edge("hydration", "interactive", "e-hydrate-done")
      .stroke("#4ade80", 1.4);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Type", value: "Client", color: "#fbbf24" },
      {
        label: "JS",
        value: state.bundleSplit ? "Shipped" : "—",
        color: "#fbbf24",
      },
      {
        label: "Hydrated",
        value: state.hydrated ? "Yes" : "—",
        color: "#a78bfa",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.componentType = "none";
    state.bundleSplit = false;
    state.hydrated = false;
  },
};
