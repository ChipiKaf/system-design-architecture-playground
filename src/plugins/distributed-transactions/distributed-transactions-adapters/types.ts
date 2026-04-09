import type {
  DistributedTransactionsState,
  PatternKey,
} from "../distributedTransactionsSlice";
import type { FlowBeat, StepKey } from "../flow-engine";

export interface PatternProfile {
  label: string;
  shortLabel: string;
  description: string;
  context: string;
  tradeoff: string;
  terms: string[];
  criticalNodes: string[];
}

export interface PatternColors {
  fill: string;
  stroke: string;
  muted: string;
}

export interface SceneHelpers {
  hot: (zone: string) => boolean;
  phase: string;
}

export interface StatBadgeConfig {
  label: string;
  value: string | number;
  color: string;
}

export interface PatternAdapter {
  id: PatternKey;
  profile: PatternProfile;
  colors: PatternColors;
  computeMetrics(state: DistributedTransactionsState): void;
  expandToken(token: string, state: DistributedTransactionsState): string[] | null;
  getOverviewHotZones(state: DistributedTransactionsState): string[];
  getOverviewExplanation(state: DistributedTransactionsState): string;
  getStepFlows(step: StepKey, state: DistributedTransactionsState): FlowBeat[];
  getStepHotZones(step: StepKey, state: DistributedTransactionsState): string[];
  getStepExplanation(step: StepKey, state: DistributedTransactionsState): string;
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any -- viz() builder
    state: DistributedTransactionsState,
    helpers: SceneHelpers,
  ): void;
  getStatBadges(state: DistributedTransactionsState): StatBadgeConfig[];
  softReset(state: DistributedTransactionsState): void;
}
