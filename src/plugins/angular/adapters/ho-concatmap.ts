import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: concatMap flow ───────────────────────── */
const POS = {
  source: { x: 480, y: 55 },
  operator: { x: 480, y: 185 },
  inner1: { x: 200, y: 315 },
  inner2: { x: 760, y: 315 },
  output: { x: 480, y: 435 },
  result: { x: 480, y: 560 },
};

export const hoConcatmapAdapter: AngularAdapter = {
  id: "ho-concatmap",

  profile: {
    label: "concatMap",
    description:
      "Queues inner Observables and runs them sequentially — waits for the current one to complete before subscribing to the next. Good for ordered API calls.",
  },

  colors: { fill: "#064e3b", stroke: "#22c55e" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "ho-source" ||
      p === "ho-map" ||
      p === "ho-inner" ||
      p === "ho-output" ||
      p === "ho-summary";
    state.innerStrategy = active ? "queue" : "none";
    state.concurrency = active ? "sequential" : "none";
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
        color: "#22c55e",
        explain:
          "✓ Results arrive in strict order — Inner #1 completes, then Inner #2 runs. Order is guaranteed.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.innerStrategy === "queue";

    builder
      .node("source")
      .at(POS.source.x, POS.source.y)
      .rect(260, 55, 12)
      .fill(hot("source") ? "#064e3b" : "#0f172a")
      .stroke(hot("source") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Source Observable");
          l.newline();
          l.color("e.g. actions$.pipe(...)", "#86efac", { fontSize: 9 });
        },
        { fill: "#d1fae5", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("operator")
      .at(POS.operator.x, POS.operator.y)
      .rect(260, 58, 12)
      .fill(hot("operator") ? "#064e3b" : "#0f172a")
      .stroke(hot("operator") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("concatMap(action => ...)");
          l.newline();
          l.code("Queue & run sequentially");
        },
        { fill: "#86efac", fontSize: 10, dy: -4, lineHeight: 1.6 },
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
            active ? "✓ Runs first" : "First API call",
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
      .fill(hot("inner2") ? "#78350f" : "#0f172a")
      .stroke(hot("inner2") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Inner #2 (queued)");
          l.newline();
          l.color(
            active ? "⏳ Waiting for #1 to complete" : "Second API call",
            active ? "#fbbf24" : "#94a3b8",
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
            active ? "✓ Ordered results" : "Results in strict order",
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
      .stroke(hot("result") ? "#22c55e" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "✓ Sequential execution: order guaranteed, no overlap"
              : "concatMap: queue inner observables, run one at a time",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#86efac", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("source", "operator", "e-src-op")
      .stroke(hot("operator") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("1. Emit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("operator", "inner1", "e-op-in1")
      .stroke(hot("inner1") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("2a. Run first", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("operator", "inner2", "e-op-in2")
      .stroke(hot("inner2") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("2b. Queued", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("inner1", "output", "e-in1-out")
      .stroke(hot("output") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("3. Complete → #2 runs", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("inner2", "output", "e-in2-out")
      .stroke(hot("output") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("4. Then emit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("output", "result", "e-out-res")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Strategy", value: "Queue", color: "#22c55e" },
      {
        label: "Concurrency",
        value: state.concurrency === "sequential" ? "Sequential" : "—",
        color: state.concurrency === "sequential" ? "#f59e0b" : "#64748b",
      },
      { label: "Use case", value: "Ordered calls", color: "#f59e0b" },
    ];
  },

  softReset(state: AngularState) {
    state.innerStrategy = "none";
    state.concurrency = "none";
    state.duplicateGuard = false;
  },
};
