import type { AngularConstructorVsNgoninitAdapter } from "./types";
import type { AngularConstructorVsNgoninitState } from "../angularConstructorVsNgoninitSlice";

export const variantBAdapter: AngularConstructorVsNgoninitAdapter = {
  id: "variant-b",

  profile: {
    label: "Variant B",
    description: "Describe variant B's approach.",
  },

  colors: {
    fill: "#064e3b",
    stroke: "#22c55e",
  },

  /* ── Metrics ───────────────────────────────────────── */

  computeMetrics(state: AngularConstructorVsNgoninitState) {
    // TODO: compute real metrics for variant B
    state.latencyMs = 120;
    state.throughput = 2000;
  },

  /* ── Token expansion ───────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expandToken(_token: string, _state: AngularConstructorVsNgoninitState): string[] | null {
    return null;
  },

  /* ── Flow engine ───────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFlowBeats(_state: AngularConstructorVsNgoninitState) {
    return [];
  },

  /* ── Scene ─────────────────────────────────────────── */

  buildTopology(builder, _state, helpers) {
    // TODO: build variant-B-specific nodes & edges
    builder
      .node("node-a")
      .at(200, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-a") ? "#064e3b" : "#0f172a")
      .stroke(helpers.hot("node-a") ? "#22c55e" : "#334155", 2)
      .label("Node A", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("node-b")
      .at(650, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-b") ? "#064e3b" : "#0f172a")
      .stroke(helpers.hot("node-b") ? "#22c55e" : "#334155", 2)
      .label("Node B", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .edge("node-a", "node-b", "edge-ab")
      .stroke("#475569", 2)
      .animate("flow", { duration: "3s" });
  },

  getStatBadges(state: AngularConstructorVsNgoninitState) {
    return [
      { label: "Variant", value: "B", color: "#22c55e" },
      { label: "Latency", value: `${state.latencyMs}ms`, color: "#60a5fa" },
      { label: "Throughput", value: `${state.throughput} rps`, color: "#22c55e" },
    ];
  },

  /* ── Soft reset ────────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  softReset(_state: AngularConstructorVsNgoninitState) {
    // TODO: randomise per-pass state if needed
  },
};
