import type { CommandsQueriesState, PatternKey } from "../commandsQueriesSlice";
import type { FlowBeat, StepDef, StepKey } from "../flow-engine";

export interface PatternProfile {
  key: PatternKey;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  readStrategy: string;
  writeStrategy: string;
  tradeoff: string;
  bestFor: string;
  benefits: string[];
  drawbacks: string[];
}

export interface SceneHelpers {
  hot: (zone: string) => boolean;
  openConcept: (key: string) => void;
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
  computeMetrics: (state: CommandsQueriesState) => void;
  getOverviewHotZones: (state: CommandsQueriesState) => string[];
  getOverviewExplanation: (state: CommandsQueriesState) => string;
  expandToken: (token: string, state: CommandsQueriesState) => string[] | null;
  getStepFlows: (step: StepKey, state: CommandsQueriesState) => FlowBeat[];
  getStepHotZones: (step: StepKey, state: CommandsQueriesState) => string[];
  getStepExplanation: (step: StepKey, state: CommandsQueriesState) => string;
  reorderSteps: (steps: StepDef[], state: CommandsQueriesState) => StepDef[];
  relabelStep: (step: StepDef, state: CommandsQueriesState) => string;
  buildScene: (
    builder: ReturnType<typeof import("vizcraft").viz>,
    state: CommandsQueriesState,
    helpers: SceneHelpers,
  ) => void;
  getStatBadges: (state: CommandsQueriesState) => StatBadgeConfig[];
  softReset: (state: CommandsQueriesState) => void;
}
