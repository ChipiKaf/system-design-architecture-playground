import type { GraphqlApiState } from "./graphqlApiSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   GraphqlApi Lab — Declarative Flow Engine

   Uses the shared lab-engine for build/execute logic.
   This file defines the plugin-specific steps, tokens,
   and type aliases.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<GraphqlApiState>;
export type StepDef = GenericStepDef<GraphqlApiState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<GraphqlApiState>;

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(token: string, _state: GraphqlApiState): string[] {
  // TODO: expand $-prefixed tokens to runtime node IDs
  // e.g. if (token === "$clients") return state.clients.map(c => c.id);
  return [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "overview"
  | "send-traffic"
  | "observe-metrics"
  | "summary";
// TODO: add more step keys as needed

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Send Traffic",
    action: "resetRun",
    explain: (s) =>
      `${s.variant === "variant-a" ? "Variant A" : "Variant B"} selected. Step through to compare.`,
  },
  {
    key: "send-traffic",
    label: "Send Traffic",
    processingText: "Sending...",
    nextButtonColor: "#2563eb",
    phase: "traffic",
    flow: [
      {
        from: "node-a",
        to: "node-b",
        duration: 700,
        explain: "Requests flow from A to B.",
      },
    ],
    recalcMetrics: true,
    explain: (s) =>
      `Throughput: ${s.throughput} rps — Latency: ${s.latencyMs}ms.`,
  },
  {
    key: "observe-metrics",
    label: "Observe Metrics",
    nextButtonColor: "#2563eb",
    recalcMetrics: true,
    delay: 500,
    phase: "comparison",
    finalHotZones: ["node-b"],
    explain: (s) =>
      `${s.variant === "variant-a" ? "Variant A" : "Variant B"} — ${s.throughput} rps at ${s.latencyMs}ms latency.`,
  },
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) =>
      `Comparison complete. Try switching variants and replaying.`,
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: GraphqlApiState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
