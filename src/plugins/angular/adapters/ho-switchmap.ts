import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: switchMap flow ────────────────────────── */
const POS = {
  source: { x: 480, y: 55 },
  operator: { x: 480, y: 185 },
  inner1: { x: 200, y: 315 },
  inner2: { x: 760, y: 315 },
  output: { x: 480, y: 435 },
  result: { x: 480, y: 560 },
};

export const hoSwitchmapAdapter: AngularAdapter = {
  id: "ho-switchmap",

  profile: {
    label: "switchMap",
    description:
      "Cancels the previous inner Observable when the source emits a new value. Ideal for live search, type-ahead requests, and route param changes.",
  },

  colors: { fill: "#312e81", stroke: "#a78bfa" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "ho-source" ||
      p === "ho-map" ||
      p === "ho-inner" ||
      p === "ho-output" ||
      p === "ho-summary";
    state.innerStrategy = active ? "cancel" : "none";
    state.concurrency = active ? "single" : "none";
    state.duplicateGuard = false;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "output",
        to: "result",
        duration: 600,
        color: "#a78bfa",
        explain:
          "✓ Only the latest inner Observable's output reaches the subscriber. Previous requests are automatically cancelled.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.innerStrategy === "cancel";

    builder
      .node("source")
      .at(POS.source.x, POS.source.y)
      .rect(260, 55, 12)
      .fill(hot("source") ? "#312e81" : "#0f172a")
      .stroke(hot("source") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Source Observable");
          l.newline();
          l.color("e.g. searchInput$.valueChanges", "#c4b5fd", {
            fontSize: 9,
          });
        },
        { fill: "#e0d4ff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("operator")
      .at(POS.operator.x, POS.operator.y)
      .rect(260, 58, 12)
      .fill(hot("operator") ? "#312e81" : "#0f172a")
      .stroke(hot("operator") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("switchMap(term => ...)");
          l.newline();
          l.code("Cancels previous, starts new");
        },
        { fill: "#c4b5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("inner1")
      .at(POS.inner1.x, POS.inner1.y)
      .rect(220, 55, 12)
      .fill(hot("inner1") ? "#450a0a" : "#0f172a")
      .stroke(hot("inner1") ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Inner #1");
          l.newline();
          l.color(
            active ? "✗ Cancelled" : "Previous request",
            active ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("inner2")
      .at(POS.inner2.x, POS.inner2.y)
      .rect(220, 55, 12)
      .fill(hot("inner2") ? "#064e3b" : "#0f172a")
      .stroke(hot("inner2") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Inner #2 (latest)");
          l.newline();
          l.color(
            active ? "✓ Active — only this emits" : "Latest request",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("output")
      .at(POS.output.x, POS.output.y)
      .rect(240, 55, 12)
      .fill(hot("output") ? "#78350f" : "#0f172a")
      .stroke(hot("output") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Output Stream");
          l.newline();
          l.color(
            active ? "✓ Latest result only" : "Subscriber receives values",
            active ? "#fbbf24" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fde68a", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(300, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#a78bfa" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "✓ Auto-cancel: no stale responses, no race conditions"
              : "switchMap: cancel previous, keep latest",
            active ? "#c4b5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#c4b5fd", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("source", "operator", "e-src-op")
      .stroke(hot("operator") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("1. Emit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("operator", "inner1", "e-op-in1")
      .stroke(hot("inner1") ? "#f87171" : "#475569", 2)
      .arrow(true)
      .label("2a. Cancel", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("operator", "inner2", "e-op-in2")
      .stroke(hot("inner2") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("2b. Subscribe", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("inner2", "output", "e-in2-out")
      .stroke(hot("output") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("3. Emit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("output", "result", "e-out-res")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Strategy", value: "Cancel prev", color: "#a78bfa" },
      {
        label: "Concurrency",
        value: state.concurrency === "single" ? "1 at a time" : "—",
        color: state.concurrency === "single" ? "#22c55e" : "#64748b",
      },
      { label: "Use case", value: "Search", color: "#f59e0b" },
    ];
  },

  softReset(state: AngularState) {
    state.innerStrategy = "none";
    state.concurrency = "none";
    state.duplicateGuard = false;
  },
};
