import type { AngularConstructorVsNgoninitAdapter } from "./types";
import type { AngularConstructorVsNgoninitState } from "../angularConstructorVsNgoninitSlice";

export const variantAAdapter: AngularConstructorVsNgoninitAdapter = {
  id: "variant-a",

  profile: {
    label: "Variant A",
    description: "Describe variant A's approach.",
  },

  colors: {
    fill: "#1e3a5f",
    stroke: "#3b82f6",
  },

  /* ── Metrics ───────────────────────────────────────── */

  computeMetrics(state: AngularConstructorVsNgoninitState) {
    // TODO: compute real metrics for variant A
    state.latencyMs = 50;
    state.throughput = 1000;
  },

  /* ── Token expansion ───────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expandToken(_token: string, _state: AngularConstructorVsNgoninitState): string[] | null {
    // TODO: expand $-tokens to concrete node IDs
    // e.g. if (token === "$nodes") return state.nodes.map(n => n.id);
    return null; // fallback — use token as-is
  },

  /* ── Flow engine ───────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFlowBeats(_state: AngularConstructorVsNgoninitState) {
    // TODO: return adapter-specific flow beats
    return [];
  },

  /* ── Scene ─────────────────────────────────────────── */

  buildTopology(builder, _state, helpers) {
    // TODO: build variant-A-specific nodes & edges
    builder
      .node("node-a")
      .at(200, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-a") ? "#1e40af" : "#0f172a")
      .stroke(helpers.hot("node-a") ? "#60a5fa" : "#334155", 2)
      .label("Node A", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("node-b")
      .at(650, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-b") ? "#065f46" : "#0f172a")
      .stroke(helpers.hot("node-b") ? "#34d399" : "#334155", 2)
      .label("Node B", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .edge("node-a", "node-b", "edge-ab")
      .stroke("#475569", 2)
      .animate("flow", { duration: "3s" });
  },

  getStatBadges(state: AngularConstructorVsNgoninitState) {
    return [
      { label: "Variant", value: "A", color: "#3b82f6" },
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
