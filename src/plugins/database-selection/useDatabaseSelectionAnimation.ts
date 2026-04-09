import {
  patchState,
  softResetRun,
  recalcMetrics,
  type DatabaseSelectionState,
} from "./databaseSelectionSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<DatabaseSelectionState, StepKey> = {
  selector: (root) => root.databaseSelection as DatabaseSelectionState,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    resetRun: { create: () => softResetRun(), terminal: true },
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (p) => patchState(p),
};

export const useDatabaseSelectionAnimation = (
  onAnimationComplete?: () => void,
) => useLabAnimation(labConfig, onAnimationComplete);
