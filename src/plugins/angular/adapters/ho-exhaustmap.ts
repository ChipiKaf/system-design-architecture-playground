import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: exhaustMap flow ──────────────────────── */
const POS = {
  source: { x: 480, y: 55 },
  operator: { x: 480, y: 185 },
  inner1: { x: 200, y: 315 },
  inner2: { x: 760, y: 315 },
  output: { x: 480, y: 435 },
  result: { x: 480, y: 560 },
};

export const hoExhaustmapAdapter: AngularAdapter = {
  id: "ho-exhaustmap",

  profile: {
    label: "exhaustMap",
    description:
      "Ignores new source emissions while an inner Observable is still running — prevents duplicate work. Good for form submits and login clicks.",
  },

  colors: { fill: "#78350f", stroke: "#f59e0b" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "ho-source" ||
      p === "ho-map" ||
      p === "ho-inner" ||
      p === "ho-output" ||
      p === "ho-summary";
    state.innerStrategy = active ? "ignore" : "none";
    state.concurrency = active ? "single" : "none";
    state.duplicateGuard = active;
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
        color: "#f59e0b",
        explain:
          "✓ Only the first inner runs — subsequent clicks are ignored until the inner completes.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.innerStrategy === "ignore";

    builder
      .node("source")
      .at(POS.source.x, POS.source.y)
      .rect(260, 55, 12)
      .fill(hot("source") ? "#78350f" : "#0f172a")
      .stroke(hot("source") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Source Observable");
          l.newline();
          l.color("e.g. submitBtn.click$", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fde68a", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("operator")
      .at(POS.operator.x, POS.operator.y)
      .rect(260, 58, 12)
      .fill(hot("operator") ? "#78350f" : "#0f172a")
      .stroke(hot("operator") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("exhaustMap(click => ...)");
          l.newline();
          l.code("Ignore while busy");
        },
        { fill: "#fde68a", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("inner1")
      .at(POS.inner1.x, POS.inner1.y)
      .rect(220, 55, 12)
      .fill(hot("inner1") ? "#064e3b" : "#0f172a")
      .stroke(hot("inner1") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Inner #1 (active)");
          l.newline();
          l.color(
            active ? "✓ Running — owns the slot" : "HTTP POST request",
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
      .fill(hot("inner2") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("inner2") ? "#ef4444" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Inner #2 (ignored)");
          l.newline();
          l.color(
            active ? "✗ Dropped — inner busy" : "Duplicate click",
            active ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("output")
      .at(POS.output.x, POS.output.y)
      .rect(240, 55, 12)
      .fill(hot("output") ? "#064e3b" : "#0f172a")
      .stroke(hot("output") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Output Stream");
          l.newline();
          l.color(
            active ? "✓ Only Inner #1 result" : "Single result",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#86efac", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(300, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#f59e0b" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "✓ Duplicate-safe: new emissions ignored while inner is active"
              : "exhaustMap: ignore new while inner is running",
            active ? "#fde68a" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fde68a", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("source", "operator", "e-src-op")
      .stroke(hot("operator") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("1. Emit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("operator", "inner1", "e-op-in1")
      .stroke(hot("inner1") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("2a. Subscribe", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("operator", "inner2", "e-op-in2")
      .stroke(hot("inner2") ? "#ef4444" : "#475569", 2)
      .arrow(true)
      .label("2b. Ignored ✗", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("inner1", "output", "e-in1-out")
      .stroke(hot("output") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("3. Result", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("inner2", "output", "e-in2-out")
      .stroke("#475569", 1)
      .dash("4 4")
      .arrow(true)
      .label("✗ No output", { fill: "#64748b", fontSize: 8 });

    builder
      .edge("output", "result", "e-out-res")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Strategy", value: "Ignore new", color: "#ef4444" },
      {
        label: "Concurrency",
        value: state.concurrency === "single" ? "1 at a time" : "—",
        color: state.concurrency === "single" ? "#f59e0b" : "#64748b",
      },
      {
        label: "Duplicate guard",
        value: state.duplicateGuard ? "Yes" : "No",
        color: "#22c55e",
      },
    ];
  },

  softReset(state: AngularState) {
    state.innerStrategy = "none";
    state.concurrency = "none";
    state.duplicateGuard = false;
  },
};
