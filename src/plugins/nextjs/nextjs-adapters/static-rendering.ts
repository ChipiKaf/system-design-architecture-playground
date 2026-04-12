import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

/* ══════════════════════════════════════════════════════════
   Static Rendering — the full lifecycle

   Phase 1  BUILD      npm run build → Page() → HTML → disk
   Phase 2  FIRST LOAD CDN → browser (visible!) → JS → hydrate
   Phase 3  NAVIGATION  user clicks → RSC fetch → swap (no reload)
   ══════════════════════════════════════════════════════════ */

/* ── Positions ───────────────────────────────────────── */
const POS = {
  /* Row 1 — Build (green) */
  nextBuild: { x: 60, y: 60 },
  runComp: { x: 280, y: 60 },
  renderHtml: { x: 500, y: 60 },
  saveDisk: { x: 720, y: 60 },
  /* Row 2 — First Load (blue → amber → purple) */
  cdn: { x: 60, y: 200 },
  browser: { x: 280, y: 200 },
  jsBundle: { x: 500, y: 200 },
  hydrate: { x: 720, y: 200 },
  /* Row 3 — Navigation / SPA mode (cyan) */
  clickLink: { x: 60, y: 340 },
  rscFetch: { x: 280, y: 340 },
  swapUI: { x: 500, y: 340 },
};

export const staticRenderingAdapter: NextjsAdapter = {
  id: "static-rendering",

  profile: {
    label: "Static Rendering",
    description:
      "Next.js executes your components at build time, saves the HTML, then behaves like an SPA after the first load.",
  },

  colors: { fill: "#14532d", stroke: "#4ade80" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.renderMode = active ? "static" : "none";
    state.htmlSent = active;
    state.jsLoaded = state.phase === "summary";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      /* ── Phase 1: Build ── */
      {
        from: "next-build",
        to: "run-comp",
        duration: 600,
        color: "#4ade80",
        explain:
          "npm run build starts. Next.js calls your Page() function in Node.js — no browser, no user. If the component fetches data, that fetch runs now.",
      },
      {
        from: "run-comp",
        to: "render-html",
        duration: 550,
        color: "#4ade80",
        explain:
          "React\u2019s server renderer converts the component tree to real HTML: <h1>Products</h1><div>42</div>. Not an empty shell \u2014 actual content, baked in.",
      },
      {
        from: "render-html",
        to: "save-disk",
        duration: 500,
        color: "#4ade80",
        explain:
          "Next.js saves the HTML to .next/server/app/page.html. The page is now frozen \u2014 a snapshot of your component\u2019s output at build time.",
      },
      /* ── Phase 2: First Load ── */
      {
        from: "save-disk",
        to: "cdn",
        duration: 500,
        color: "#60a5fa",
        explain:
          "On deploy, pre-built HTML is pushed to CDN edges. Every visitor gets the same cached result. No React execution at request time.",
      },
      {
        from: "cdn",
        to: "browser",
        duration: 500,
        color: "#60a5fa",
        explain:
          "The browser receives fully rendered HTML. The user sees headings, text, images instantly \u2014 the page is visible. But buttons don\u2019t work yet.",
      },
      {
        from: "cdn",
        to: "js-bundle",
        duration: 500,
        color: "#fbbf24",
        explain:
          "In the background, a JS bundle loads. It contains React and your \u2018use client\u2019 component code. This is NOT what renders the page \u2014 that was already done.",
      },
      {
        from: "js-bundle",
        to: "hydrate",
        duration: 550,
        color: "#a78bfa",
        explain:
          "React hydrates: walks the already-visible DOM and attaches event handlers to Client Components. useState, onClick, inputs all come alive.",
      },
      /* ── Phase 3: Navigation (SPA mode) ── */
      {
        from: "browser",
        to: "click-link",
        duration: 450,
        color: "#22d3ee",
        explain:
          "After hydration, the app is now a hybrid SPA. When the user clicks a link, Next.js intercepts it \u2014 no full page reload happens.",
      },
      {
        from: "click-link",
        to: "rsc-fetch",
        duration: 500,
        color: "#22d3ee",
        explain:
          "Instead of requesting a new HTML page, Next.js fetches an RSC payload \u2014 a lightweight description of the new route\u2019s component tree. Much smaller than full HTML.",
      },
      {
        from: "rsc-fetch",
        to: "swap-ui",
        duration: 450,
        color: "#22d3ee",
        explain:
          "React swaps just the changed parts of the UI. Layouts persist, state is preserved, no white flash. First load = MPA. After that = SPA. That\u2019s the hybrid model.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Run Components",
      "Render to HTML",
      "Save to Disk",
      "Deploy to CDN",
      "HTML Arrives (Visible)",
      "JS Bundle Loads",
      "Hydrate Client Parts",
      "User Clicks Link",
      "Fetch RSC Payload",
      "Swap UI (No Reload)",
    ];
  },

  buildTopology(builder: any, _state: NextjsState, helpers) {
    const hot = helpers.hot;

    /* ════ Row 1: Build phase (green) ════ */
    builder
      .node("next-build")
      .at(POS.nextBuild.x, POS.nextBuild.y)
      .rect(150, 52, 12)
      .fill(hot("next-build") ? "#14532d" : "#0f172a")
      .stroke(hot("next-build") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("npm run build");
          l.newline();
          l.color("Node.js process", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("run-comp")
      .at(POS.runComp.x, POS.runComp.y)
      .rect(150, 52, 12)
      .fill(hot("run-comp") ? "#14532d" : "#0f172a")
      .stroke(hot("run-comp") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Run Page()");
          l.newline();
          l.color("component + fetch", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("render-html")
      .at(POS.renderHtml.x, POS.renderHtml.y)
      .rect(150, 52, 12)
      .fill(hot("render-html") ? "#14532d" : "#0f172a")
      .stroke(hot("render-html") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Render to HTML");
          l.newline();
          l.color("real markup, not empty", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("save-disk")
      .at(POS.saveDisk.x, POS.saveDisk.y)
      .rect(150, 52, 12)
      .fill(hot("save-disk") ? "#14532d" : "#0f172a")
      .stroke(hot("save-disk") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Save to Disk");
          l.newline();
          l.color(".next/server/app/", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ════ Row 2: First Load (blue/amber/purple) ════ */
    builder
      .node("cdn")
      .at(POS.cdn.x, POS.cdn.y)
      .rect(150, 52, 12)
      .fill(hot("cdn") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("cdn") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("CDN Edge");
          l.newline();
          l.color("cached worldwide", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("browser")
      .at(POS.browser.x, POS.browser.y)
      .rect(150, 52, 12)
      .fill(hot("browser") ? "#78350f" : "#0f172a")
      .stroke(hot("browser") ? "#fbbf24" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Browser");
          l.newline();
          l.color("real HTML \u2014 visible!", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("js-bundle")
      .at(POS.jsBundle.x, POS.jsBundle.y)
      .rect(150, 52, 12)
      .fill(hot("js-bundle") ? "#78350f" : "#0f172a")
      .stroke(hot("js-bundle") ? "#fbbf24" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("JS Bundle");
          l.newline();
          l.color("React + 'use client'", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("hydrate")
      .at(POS.hydrate.x, POS.hydrate.y)
      .rect(150, 52, 12)
      .fill(hot("hydrate") ? "#312e81" : "#0f172a")
      .stroke(hot("hydrate") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Hydration");
          l.newline();
          l.color("attach handlers", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ════ Row 3: SPA Navigation (cyan) ════ */
    builder
      .node("click-link")
      .at(POS.clickLink.x, POS.clickLink.y)
      .rect(150, 52, 12)
      .fill(hot("click-link") ? "#164e63" : "#0f172a")
      .stroke(hot("click-link") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("User Clicks Link");
          l.newline();
          l.color("intercepted, no reload", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("rsc-fetch")
      .at(POS.rscFetch.x, POS.rscFetch.y)
      .rect(150, 52, 12)
      .fill(hot("rsc-fetch") ? "#164e63" : "#0f172a")
      .stroke(hot("rsc-fetch") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Fetch RSC Payload");
          l.newline();
          l.color("lightweight tree, not HTML", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("swap-ui")
      .at(POS.swapUI.x, POS.swapUI.y)
      .rect(150, 52, 12)
      .fill(hot("swap-ui") ? "#164e63" : "#0f172a")
      .stroke(hot("swap-ui") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Swap UI");
          l.newline();
          l.color("layouts persist, no flash", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ── Edges ── */
    /* Build pipeline (green) */
    builder
      .edge("next-build", "run-comp", "e-build-run")
      .stroke("#4ade80", 1.4);
    builder
      .edge("run-comp", "render-html", "e-run-render")
      .stroke("#4ade80", 1.4);
    builder
      .edge("render-html", "save-disk", "e-render-save")
      .stroke("#4ade80", 1.4);
    /* First load: deploy + serve (blue) */
    builder.edge("save-disk", "cdn", "e-save-cdn").stroke("#60a5fa", 1.4);
    builder.edge("cdn", "browser", "e-cdn-browser").stroke("#60a5fa", 1.4);
    /* First load: JS + hydrate (amber/purple) */
    builder
      .edge("cdn", "js-bundle", "e-cdn-js")
      .stroke("#fbbf24", 1.2)
      .dashed();
    builder.edge("js-bundle", "hydrate", "e-js-hydrate").stroke("#a78bfa", 1.4);
    /* SPA navigation (cyan) */
    builder
      .edge("browser", "click-link", "e-browser-click")
      .stroke("#22d3ee", 1.2)
      .dashed();
    builder
      .edge("click-link", "rsc-fetch", "e-click-rsc")
      .stroke("#22d3ee", 1.4);
    builder.edge("rsc-fetch", "swap-ui", "e-rsc-swap").stroke("#22d3ee", 1.4);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Mode", value: "Static", color: "#4ade80" },
      {
        label: "HTML",
        value: state.htmlSent ? "Pre-built" : "\u2014",
        color: "#86efac",
      },
      {
        label: "Hydrated",
        value: state.jsLoaded ? "Yes" : "\u2014",
        color: "#a78bfa",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.renderMode = "none";
    state.htmlSent = false;
    state.jsLoaded = false;
  },
};
