import type { AngularConstructorVsNgoninitState } from "./angularConstructorVsNgoninitSlice";
import { getAdapter } from "./angular-constructor-vs-ngoninit-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   AngularConstructorVsNgoninit Lab — Declarative Flow Engine

   Uses the shared lab-engine for build/execute logic.
   Token expansion and flow beats delegate to adapters.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<AngularConstructorVsNgoninitState>;
export type StepDef = GenericStepDef<AngularConstructorVsNgoninitState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<AngularConstructorVsNgoninitState>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(token: string, state: AngularConstructorVsNgoninitState): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey = "overview" | "send-traffic" | "observe-metrics" | "summary";
// TODO: add more step keys as needed

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Send Traffic",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} selected. Step through to compare.`;
    },
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
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} — ${s.throughput} rps at ${s.latencyMs}ms latency.`;
    },
  },
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: () =>
      `Comparison complete. Try switching variants and replaying.`,
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: AngularConstructorVsNgoninitState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
