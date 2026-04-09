import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: mergeMap flow ────────────────────────── */
const POS = {
  source: { x: 480, y: 55 },
  operator: { x: 480, y: 185 },
  inner1: { x: 200, y: 315 },
  inner2: { x: 760, y: 315 },
  output: { x: 480, y: 435 },
  result: { x: 480, y: 560 },
};

export const hoMergemapAdapter: AngularAdapter = {
  id: "ho-mergemap",

  profile: {
    label: "mergeMap",
    description:
      "Subscribes to all inner Observables concurrently and interleaves their outputs. Use for parallel tasks such as uploading multiple files.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "ho-source" ||
      p === "ho-map" ||
      p === "ho-inner" ||
      p === "ho-output" ||
      p === "ho-summary";
    state.innerStrategy = active ? "merge" : "none";
    state.concurrency = active ? "unlimited" : "none";
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
        color: "#3b82f6",
        explain:
          "✓ All inner Observables run in parallel. Results arrive in whatever order they complete — interleaved.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.innerStrategy === "merge";

    builder
      .node("source")
      .at(POS.source.x, POS.source.y)
      .rect(260, 55, 12)
      .fill(hot("source") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("source") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Source Observable");
          l.newline();
          l.color("e.g. files$.pipe(...)", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#dbeafe", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("operator")
      .at(POS.operator.x, POS.operator.y)
      .rect(260, 58, 12)
      .fill(hot("operator") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("operator") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("mergeMap(file => ...)");
          l.newline();
          l.code("All run concurrently");
        },
        { fill: "#93c5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("inner1")
      .at(POS.inner1.x, POS.inner1.y)
      .rect(220, 55, 12)
      .fill(hot("inner1") ? "#064e3b" : "#0f172a")
      .stroke(hot("inner1") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Inner #1");
          l.newline();
          l.color(
            active ? "✓ Running (parallel)" : "Upload file A",
            active ? "#86efac" : "#94a3b8",
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
          l.bold("Inner #2");
          l.newline();
          l.color(
            active ? "✓ Running (parallel)" : "Upload file B",
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
            active ? "✓ Interleaved results" : "Results arrive as completed",
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
      .stroke(hot("result") ? "#3b82f6" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "✓ Maximum throughput: all tasks run simultaneously"
              : "mergeMap: subscribe to all, interleave outputs",
            active ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#93c5fd", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("source", "operator", "e-src-op")
      .stroke(hot("operator") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("1. Emit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("operator", "inner1", "e-op-in1")
      .stroke(hot("inner1") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("2a. Subscribe", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("operator", "inner2", "e-op-in2")
      .stroke(hot("inner2") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("2b. Subscribe", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("inner1", "output", "e-in1-out")
      .stroke(hot("output") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("3a. Emit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("inner2", "output", "e-in2-out")
      .stroke(hot("output") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("3b. Emit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("output", "result", "e-out-res")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Strategy", value: "Merge all", color: "#3b82f6" },
      {
        label: "Concurrency",
        value: state.concurrency === "unlimited" ? "Unlimited" : "—",
        color: state.concurrency === "unlimited" ? "#22c55e" : "#64748b",
      },
      { label: "Use case", value: "Parallel uploads", color: "#f59e0b" },
    ];
  },

  softReset(state: AngularState) {
    state.innerStrategy = "none";
    state.concurrency = "none";
    state.duplicateGuard = false;
  },
};
