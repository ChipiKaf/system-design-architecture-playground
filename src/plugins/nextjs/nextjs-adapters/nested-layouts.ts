import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

const POS = {
  nav: { x: 100, y: 200 },
  rootLayout: { x: 330, y: 80 },
  dashLayout: { x: 330, y: 330 },
  oldPage: { x: 580, y: 80 },
  newPage: { x: 580, y: 330 },
  result: { x: 780, y: 200 },
};

export const nestedLayoutsAdapter: NextjsAdapter = {
  id: "nested-layouts",

  profile: {
    label: "Nested Layouts",
    description:
      "Layouts are like transparent layers — global frame, section frame, page content. Navigation only swaps the inner part. Like changing content inside a picture frame without rebuilding the wall.",
  },

  colors: { fill: "#4c1d95", stroke: "#a78bfa" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.layoutPersisted = active;
    state.segmentSwapped = state.phase === "summary";
    state.routeResolved = active;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "nav",
        to: "root-layout",
        duration: 500,
        color: "#a78bfa",
        explain:
          "User navigates from /dashboard/overview to /dashboard/settings. The root layout stays mounted — no re-render.",
      },
      {
        from: "root-layout",
        to: "dash-layout",
        duration: 500,
        color: "#60a5fa",
        explain:
          "The dashboard layout also stays. It wraps both overview and settings — only the inner page content will change.",
      },
      {
        from: "dash-layout",
        to: "old-page",
        duration: 400,
        color: "#f87171",
        explain:
          "The old page (overview) is unmounted. Its content is removed from the render tree.",
      },
      {
        from: "dash-layout",
        to: "new-page",
        duration: 500,
        color: "#4ade80",
        explain:
          "The new page (settings) is mounted in its place. Only this inner segment was swapped — everything else persists.",
      },
      {
        from: "new-page",
        to: "result",
        duration: 400,
        color: "#22d3ee",
        explain:
          "Result: smooth navigation. No full page reload, layouts keep their state, and only the changed segment re-renders.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Navigation Event",
      "Enter Root Layout",
      "Fade Old Page",
      "Swap New Page",
      "Render Result",
    ];
  },

  buildTopology(builder: any, state: NextjsState, helpers) {
    const hot = helpers.hot;
    const swapped = state.segmentSwapped;

    builder
      .node("nav")
      .at(POS.nav.x, POS.nav.y)
      .rect(160, 56, 12)
      .fill(hot("nav") ? "#4c1d95" : "#0f172a")
      .stroke(hot("nav") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("<Link>");
          l.newline();
          l.color("client-side navigation", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("root-layout")
      .at(POS.rootLayout.x, POS.rootLayout.y)
      .rect(180, 56, 12)
      .fill(hot("root-layout") ? "#14532d" : "#0f172a")
      .stroke(hot("root-layout") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Root Layout ✓");
          l.newline();
          l.color("persisted — no re-render", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("dash-layout")
      .at(POS.dashLayout.x, POS.dashLayout.y)
      .rect(180, 56, 12)
      .fill(hot("dash-layout") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("dash-layout") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Dashboard Layout ✓");
          l.newline();
          l.color("also persisted", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("old-page")
      .at(POS.oldPage.x, POS.oldPage.y)
      .rect(170, 56, 12)
      .fill(hot("old-page") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("old-page") ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold(swapped ? "overview (removed)" : "overview/page.tsx");
          l.newline();
          l.color(
            swapped ? "unmounted" : "current page",
            swapped ? "#fca5a5" : "#94a3b8",
            {
              fontSize: 9,
            },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("new-page")
      .at(POS.newPage.x, POS.newPage.y)
      .rect(170, 56, 12)
      .fill(hot("new-page") ? "#14532d" : "#0f172a")
      .stroke(hot("new-page") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold(swapped ? "settings ✓" : "settings/page.tsx");
          l.newline();
          l.color(
            swapped ? "mounted — swapped in" : "next page",
            swapped ? "#86efac" : "#94a3b8",
            {
              fontSize: 9,
            },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(150, 56, 12)
      .fill(hot("result") ? "#164e63" : "#0f172a")
      .stroke(hot("result") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Rendered");
          l.newline();
          l.color("partial swap only", "#67e8f9", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder.edge("nav", "root-layout", "e-nav-root").stroke("#a78bfa", 1.4);
    builder
      .edge("root-layout", "dash-layout", "e-root-dash")
      .stroke("#60a5fa", 1.4);
    builder
      .edge("dash-layout", "old-page", "e-dash-old")
      .stroke("#f87171", 1.2)
      .dashed();
    builder
      .edge("dash-layout", "new-page", "e-dash-new")
      .stroke("#4ade80", 1.4);
    builder.edge("new-page", "result", "e-new-result").stroke("#22d3ee", 1.4);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Pattern", value: "Nested Layouts", color: "#a78bfa" },
      {
        label: "Layouts",
        value: state.layoutPersisted ? "Persisted" : "—",
        color: "#4ade80",
      },
      {
        label: "Swap",
        value: state.segmentSwapped ? "Page only" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.routeResolved = false;
    state.layoutPersisted = false;
    state.segmentSwapped = false;
  },
};
