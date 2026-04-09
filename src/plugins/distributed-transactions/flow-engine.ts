import type { DistributedTransactionsState } from "./distributedTransactionsSlice";
import { getAdapter } from "./distributed-transactions-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

export type FlowBeat = GenericFlowBeat<DistributedTransactionsState>;
export type StepDef = GenericStepDef<DistributedTransactionsState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<DistributedTransactionsState>;

export function expandToken(token: string, state: DistributedTransactionsState): string[] {
  const adapter = getAdapter(state.pattern);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

export type StepKey =
  | "overview"
  | "local-write"
  | "capture-intent"
  | "deliver-change"
  | "handle-failure"
  | "summary";

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Commit Local Work",
    action: "resetRun",
    phase: "overview",
    finalHotZones: (state) => getAdapter(state.pattern).getOverviewHotZones(state),
    explain: (state) => getAdapter(state.pattern).getOverviewExplanation(state),
  },
  {
    key: "local-write",
    label: "Commit Local Work",
    processingText: "Writing local state...",
    nextButton: "Capture Intent",
    nextButtonColor: "#38bdf8",
    phase: "local-write",
    flow: (state) => getAdapter(state.pattern).getStepFlows("local-write", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("local-write", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("local-write", state),
  },
  {
    key: "capture-intent",
    label: "Capture Integration Intent",
    processingText: "Capturing the next step...",
    nextButton: "Deliver Change",
    nextButtonColor: "#a78bfa",
    phase: "capture-intent",
    flow: (state) => getAdapter(state.pattern).getStepFlows("capture-intent", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("capture-intent", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("capture-intent", state),
  },
  {
    key: "deliver-change",
    label: "Deliver Change Across Services",
    processingText: "Propagating the change...",
    nextButton: "Inspect Failure Window",
    nextButtonColor: "#22c55e",
    phase: "deliver-change",
    flow: (state) => getAdapter(state.pattern).getStepFlows("deliver-change", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("deliver-change", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("deliver-change", state),
  },
  {
    key: "handle-failure",
    label: "Inspect Failure Window",
    processingText: "Tracing the failure boundary...",
    nextButton: "Takeaway",
    nextButtonColor: "#f59e0b",
    phase: "handle-failure",
    flow: (state) => getAdapter(state.pattern).getStepFlows("handle-failure", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("handle-failure", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("handle-failure", state),
  },
  {
    key: "summary",
    label: "Takeaway",
    phase: "summary",
    finalHotZones: (state) => getAdapter(state.pattern).getOverviewHotZones(state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("summary", state),
  },
];

export function buildSteps(state: DistributedTransactionsState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
