import type { EcommerceCapState } from "./ecommerceCapSlice";
import { getAdapter } from "./ecommerce-cap-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

export type FlowBeat = GenericFlowBeat<EcommerceCapState>;
export type StepDef = GenericStepDef<EcommerceCapState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<EcommerceCapState>;

export function expandToken(token: string, state: EcommerceCapState): string[] {
  const adapter = getAdapter(state.serviceType);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

export type StepKey =
  | "overview"
  | "healthy-path"
  | "partition"
  | "decision"
  | "outcome"
  | "summary";

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Service Overview",
    nextButton: "Healthy Request",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.serviceType);
      return `${adapter.profile.label}: ${adapter.profile.description}`;
    },
  },
  {
    key: "healthy-path",
    label: "Healthy Request",
    phase: "healthy",
    processingText: "Serving request...",
    nextButtonColor: "#2563eb",
    flow: (s) => getAdapter(s.serviceType).getHealthyFlows(s),
    recalcMetrics: true,
    explain: (s) => getAdapter(s.serviceType).getHealthyExplanation(s),
  },
  {
    key: "partition",
    label: "Partition Appears",
    phase: "partition",
    processingText: "Link is partitioning...",
    nextButtonColor: "#ef4444",
    flow: (s) => getAdapter(s.serviceType).getPartitionFlows(s),
    explain: (s) => getAdapter(s.serviceType).getPartitionExplanation(s),
  },
  {
    key: "decision",
    label: "Trade-Off Decision",
    phase: "decision",
    processingText: "Choosing what to protect...",
    nextButtonColor: "#14b8a6",
    flow: (s) => getAdapter(s.serviceType).getDecisionFlows(s),
    recalcMetrics: true,
    explain: (s) => getAdapter(s.serviceType).getDecisionExplanation(s),
  },
  {
    key: "outcome",
    label: "Business Outcome",
    phase: "outcome",
    processingText: "Absorbing the trade-off...",
    nextButtonColor: "#22c55e",
    flow: (s) => getAdapter(s.serviceType).getOutcomeFlows(s),
    explain: (s) => getAdapter(s.serviceType).getOutcomeExplanation(s),
  },
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    finalHotZones: (s) => getAdapter(s.serviceType).profile.criticalNodes,
    explain: (s) => {
      const adapter = getAdapter(s.serviceType);
      return `${adapter.profile.shortLabel} is ${s.capMode}-leaning. Availability bias ${s.availabilityBias}/100, consistency bias ${s.consistencyBias}/100. ${s.partitionPolicy} ${s.acceptedRisk}`;
    },
  },
];

export function buildSteps(state: EcommerceCapState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
